---
title: Building a High-Performance and Interactive Data Application with Streamlit and DuckDB 
description: >-
  This project involves the development of a data-driven web application using Streamlit for the front-end interface and DuckDB as the core data engine. The application is designed to offer a seamless and interactive user experience for data reports.
date: 2025-06-27 00:00:00 +0800
categories: [Python, Streamlit, Duckdb]
tags: [Streamlit, Duckdb]
image:
  path: /assets/posts/2025-06-27/1.png
render_with_liquid: false
---

## Introduction

### The Challenge

Last week, I was assigned a new task at work following a major migration from our legacy payroll management system. The old system, developed in Delphi and running on a Firebird 2.0 database, was no longer supported or updated.

However, this legacy application still contained millions of historical bank remittance records for all employees, spanning its entire operational history. Although the new system was in place, the Human Resources (HR) department frequently needed to query this historical data to verify employee payment details from before the migration.

The task was to develop a simple, resource-efficient application that could generate reports from this vast dataset for the HR users.

### The Solution

To solve this, we devised a strategy to decommission the legacy database while retaining full access to its data for reporting purposes.

1.  **Data Extraction and Transformation**: All relevant information was extracted from the legacy Firebird database. The data was then cleaned, processed, and saved into a collection of segmented **Parquet files**. This format is highly efficient for analytical queries.

2.  **Efficient Querying**: With the data structured in Parquet files, we utilized **DuckDB** as our query engine. This allowed us to perform fast, direct SQL queries on the Parquet files without needing to load large volumes of data into memory, ensuring minimal computational overhead.

3.  **Application and Reporting**: The front-end of the application was built using **Streamlit**, creating a simple and intuitive interface for the users. When a user requests a report, the backend uses **Pandas** to handle the data retrieved by DuckDB. Finally, the report is generated and delivered to the user as a PDF file, created with the **FPDF** library.

This approach provided a modern, lightweight, and effective solution for accessing critical legacy data without maintaining an outdated system.

## 1 . Getting data from firebird 2.0

### Pre-requisites

To establish a connection and interact with this database, a specific set of tools was required:

1.  **Firebird 2.0 ODBC Drivers**: These drivers are essential to enable data source connections from modern applications.
2.  **Firebird Client v2.5**: A compatible client version (in this case, v2.5) was installed to communicate effectively with the v2.0 database server.

### Connection with Python

With these prerequisites installed and configured, it becomes possible to connect to the database using Python. For this task, we will use the `fdb` library, as shown in the example below.

```python
import fdb
import pandas as pd
from tqdm import tqdm
import os
import time

# --- connection Settings
HOST = 'localhost'
DATABASE_PATH = 'C:/example/example/database.GDB'
USER = 'USER'
PASSWORD = 'password'
CHARSET = 'ISO8859_1'
TABLE_NAME = 'RETORNO'
OUTPUT_DIR = 'data' 
CHUNK_SIZE = 10000000 # Number rows read by iteration

print("Connecting to Firebird...")
try:
    start_conn_time = time.time()
    db_conn = fdb.connect(
        host=HOST,
        database=DATABASE_PATH,
        user=USER,
        password=PASSWORD,
        charset=CHARSET
    )
    end_conn_time = time.time()
    print(f"Connection Established in {end_conn_time - start_conn_time:.2f} seconds")

except fdb.Error as e:
    print(f"fdb connection error: {e}")
    exit() 
except Exception as e:
    print(f"Error: {e}")
    exit()

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)
    print(f"Dir '{OUTPUT_DIR}' Created ")
else:
    print(f"Dir '{OUTPUT_DIR}' Already Exists")

sql_query = f"SELECT * FROM {TABLE_NAME}"
total_rows_exported = 0
file_count = 0

print(f"Extraction started '{TABLE_NAME}' in chunks...")
start_extraction_time = time.time()
try:
    for chunk_df in tqdm(pd.read_sql_query(sql_query, db_conn, chunksize=CHUNK_SIZE),
                         desc="extracting"):
        if not chunk_df.empty:
            chunk_df.columns = [col.strip() for col in chunk_df.columns]
            output_file_path = os.path.join(OUTPUT_DIR, f"{TABLE_NAME}_part_{file_count:05d}.parquet")
            chunk_df.to_parquet(output_file_path, index=False)
            total_rows_exported += len(chunk_df)
            file_count += 1
        
finally:
    if 'db_conn' in locals() and db_conn:
        db_conn.close()
        print("Connection closed")

end_extraction_time = time.time()
print(f"\Extraction completed!")
print(f"{total_rows_exported} rows from  '{TABLE_NAME}'.")
print(f"Exec time: {end_extraction_time - start_extraction_time:.2f} seconds.")
```

Using the code above, all tables from the database were extracted and saved as **Parquet files**.

## 2. Developing the Streamlit Application

With the data extracted and saved into a dedicated directory, the next step was to devise a method to filter it and generate reports for the HR team.

A critical project requirement was that the application had to run on a low-specification Linux machine with only **2 vCPUs and 4GB of RAM**. Consequently, loading all Parquet files into memory using libraries like Pandas or Polars was not a viable option. This approach would consume the machine's limited RAM, making the application inefficient and prone to failure.

This is why **DuckDB** was chosen as the core of our solution.

> ### About DuckDB and its Parquet Optimization
>
> DuckDB is an open-source, in-process SQL database designed for analytical queries (OLAP). Think of it as "the SQLite for analytics." It's incredibly fast, requires no external server, and integrates directly into the application.
>
> Its key advantage for this project is its ability to **directly query Parquet files** with high efficiency. Instead of loading entire files into memory, DuckDB's engine can scan the files on disk, apply filters, and pull only the specific data requested.
>
> The official documentation provides a technical explanation for this efficiency, focusing on how DuckDB interacts with "row groups" within Parquet files:
>
> > "Compression algorithms are only applied per row group, so the larger the row group size, the more opportunities to compress the data. DuckDB can read Parquet row groups in parallel even within the same file and uses predicate pushdown to only scan the row groups whose metadata ranges match the WHERE clause of the query. However there is some overhead associated with reading the metadata in each group. A good approach would be to ensure that within each file, the total number of row groups is at least as large as the number of CPU threads used to query that file. More row groups beyond the thread count would improve the speed of highly selective queries, but slow down queries that must scan the whole file like aggregations."
>
> In short, this means DuckDB intelligently avoids reading unnecessary data through:
>
> * **Parallel Scanning:** It can read multiple parts of a single Parquet file (row groups) at the same time, using all available CPU threads.
> * **Predicate Pushdown:** It first reads the metadata of each part. If the data in that section doesn't match the query's `WHERE` clause, DuckDB skips reading it entirely.
>
> This ability to selectively scan files based on user input was the main reason for its choice, allowing us to process datasets much larger than the available RAM.
>
> *Source: [Official DuckDB Parquet Documentation](https://duckdb.org/docs/stable/data/parquet/tips.html)*

By integrating DuckDB, we could use the user's inputs from the Streamlit interface to construct SQL queries. These queries would then run directly on the Parquet files, ensuring that only the pre-filtered, relevant data was ever loaded into memory, thus meeting the project's performance requirements.

```python
import pandas as pd
import duckdb

dir_files = '/dir_to_your_files/parquet_files/'

query = f"""SELECT * FROM read_parquet('{dir_files}') WHERE DT_PAGAMENTO BETWEEN ? AND ? """
params = [date1, date2]

con = duckdb.connect(database=':memory:', read_only=False)
st.session_state.results_df = con.execute(query, params).fetchdf()
con.close()
```

## 3. Building the User Interface with Streamlit

Now that we have an engine capable of performing fast and organized queries, the final step is to create a user-friendly front-end for the HR team to interact with the data.

For this purpose, we will use **Streamlit**.

> ### About Streamlit
>
> Streamlit is an open-source Python library that makes it incredibly easy to create and share beautiful, custom web applications for machine learning and data science. Its main advantage is simplicity: you can turn data scripts into interactive web apps in just a few lines of code, using only Python. It's ideal for creating internal tools, dashboards, and reports with interactive widgets like buttons, sliders, and text inputs.
>
> *Source: [Official Streamlit Documentation](https://docs.streamlit.io/)*

### Application Design and Workflow

The front-end will be designed with simplicity in mind and will feature two distinct query pages for the user to choose from:

1.  **Query by CPF:** This page will allow filtering remittance data based on:
    * A date range (start and end date).
    * The employee's CPF.

2.  **Query by Employee ID:** This page will filter based on:
    * A date range (start and end date).
    * The employee's registration ID (`matricula`).
    * The company the employee is associated with.

The user workflow is straightforward:
Once the user fills in the necessary filters on either page, a **"Search"** button will become active. Clicking this button sends the input parameters to our DuckDB engine, which executes the query on the Parquet files.

The result is returned as a **Pandas DataFrame**, which is then neatly displayed on the screen for the user to review.

Finally, a download button will also be available on the screen, allowing the user to export the resulting DataFrame as a PDF. However, the technical details of this PDF generation feature will not be covered in this post.

```python
# app.py

import streamlit as st
import pandas as pd
import duckdb
from datetime import date
import yaml
from yaml.loader import SafeLoader
import streamlit_authenticator as stauth
from pdf_generator import create_pdf_report

# --- 1. SETUP AND CONFIGURATION ---

# Path to the Parquet files. Using a wildcard (*) tells DuckDB to read all files in the directory.
PARQUET_FILES_PATH = 'base/returns/*.parquet' 

# Set the page configuration. This should be the first Streamlit command in your script.
st.set_page_config(
    page_title="test",
    layout="wide",
    page_icon=":mag:"
)

# --- 2. AUTHENTICATION ---

# Load authenticator configuration from an external YAML file.
try:
    with open('config.yaml') as file:
        config = yaml.load(file, Loader=SafeLoader)
except FileNotFoundError:
    st.error("Error: The 'config.yaml' configuration file was not found.")
    st.stop() # Halts the app if the config is missing.

# Instantiate the authenticator object.
authenticator = stauth.Authenticate(
    config['credentials'],
    config['cookie']['name'],
    config['cookie']['key'],
    config['cookie']['expiry_days']
)

# Render the login widget.
authenticator.login()


@st.cache_data(ttl=600) # Cache the query results for 10 minutes to avoid re-running identical queries.
def execute_query(query: str, params: list) -> pd.DataFrame:
    """
    Connects to DuckDB, executes a given query with parameters, and returns a Pandas DataFrame.
    Handles potential errors during the database query.
    """
    try:
        # DuckDB can run in-memory, which is perfect for this use case.
        with duckdb.connect(database=':memory:', read_only=False) as con:
            results = con.execute(query, params).fetchdf()
        return results
    except duckdb.Error as e:
        st.error(f"Database query error: {e}")
    except Exception as e:
        st.error(f"An unexpected error occurred: {e}")
    return pd.DataFrame()

def display_results(df: pd.DataFrame, report_info: dict):
    """

    Takes a DataFrame and displays the results, including a success message,
    the data table, and a PDF download button.
    """
    st.markdown("---")
    st.subheader("Query Results")
    st.success(f"Found {len(df)} records.")

    # Prepare a display version of the dataframe (e.g., formatting dates)
    df_display = df.copy()
    for col in ['DT_PAGTO', 'DT_GERADO']:
        if col in df_display.columns:
            df_display[col] = pd.to_datetime(df_display[col]).dt.strftime('%d/%m/%Y')
    
    # We drop the 'NOME' column for display, but keep it for the PDF report.
    st.dataframe(df_display.drop(columns=['NOME'], errors='ignore'), use_container_width=True)
    
    # --- PDF Download Section ---
    pdf_bytes = create_pdf_report(
        df=df.drop(columns=['NOME'], errors='ignore'), 
        report_info=report_info
    )
    
    st.download_button(
        label="Download Report as PDF",
        data=pdf_bytes,
        file_name=f"remittance_report_{report_info.get('cpf', report_info.get('matricula'))}.pdf",
        mime="application/pdf"
    )

# --- 4. MAIN APPLICATION (Protected by Authentication) ---

# st.session_state is Streamlit's way of preserving variables across user interactions (reruns).
# We check the authentication status stored in the session state.
if st.session_state.get("authentication_status"):

    # --- HEADER AND SIDEBAR ---
    col1, col2 = st.columns([1, 4], vertical_alignment="center")
    with col1:
        st.image('img/img.png', use_container_width=True)
    with col2:
        st.title(f"Welcome, *{st.session_state['name']}*")
        st.markdown("#### teste")
    
    st.markdown("---")

    with st.sidebar:
        st.header(f"User: {st.session_state['name']}")
        authenticator.logout('Logout', 'sidebar', key='logout_button')
        st.header("Navigation")
        # st.radio creates the navigation menu. The app reruns when the user changes the selection.
        selected_page = st.radio(
            "Select a page:",
            ("Query by CPF", "Query by Employee ID"),
            key='page_radio'
        )

    # --- PAGE 1: QUERY BY CPF ---
    if selected_page == "Query by CPF":
        st.header("Search Remittances by Employee CPF")

        col1, col2, col3 = st.columns(3)
        with col1:
            start_date = st.date_input("Start Date", date(2024, 5, 30), format="DD/MM/YYYY")
        with col2:
            end_date = st.date_input("End Date", date(2024, 6, 30), format="DD/MM/YYYY")
        with col3:
            cpf_filter = st.text_input("Employee CPF")

        # Disable the search button until the user provides the required input.
        is_button_disabled = not cpf_filter
        if is_button_disabled:
            st.info("ℹ️ Please enter an employee's CPF to enable the search.")

        if st.button("Search by CPF", type="primary", disabled=is_button_disabled):
            # st.spinner provides visual feedback to the user while the query is running.
            with st.spinner("Querying data... Please wait."):
                query = f"""
                    SELECT *
                    FROM read_parquet('{PARQUET_FILES_PATH}') 
                    WHERE DT_PAGAMENTO BETWEEN ? AND ? AND CPF = ?
                    ORDER BY DT_PAGAMENTO ASC, EMP ASC
                """
                params = [start_date, end_date, cpf_filter]
                results_df = execute_query(query, params)
                
                if not results_df.empty:
                    # Prepare info for the PDF report header
                    report_info = {
                        "name": results_df['NOME'].iloc[0],
                        "cpf": cpf_filter,
                        "start_date": start_date, "end_date": end_date
                    }
                    display_results(results_df, report_info)
                else:
                    st.warning("No records found for the selected filters.")

    # --- PAGE 2: QUERY BY EMPLOYEE ID ---
    elif selected_page == "Query by Employee ID":
        st.header("Search Remittances by Employee ID")

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            start_date_emp = st.date_input("Start Date", date(2024, 5, 30), key='emp_start_date', format="DD/MM/YYYY")
        with col2:
            end_date_emp = st.date_input("End Date", date(2024, 6, 30), key='emp_end_date', format="DD/MM/YYYY")
        with col3:
            company_filter = st.text_input("Company Code")
        with col4:
            id_filter = st.text_input("Employee ID (Matrícula)")
            
        is_button_disabled = not (company_filter and id_filter)
        if is_button_disabled:
            st.info("ℹ️ Please enter both Company Code and Employee ID to enable the search.")

        if st.button("Search by Employee ID", type="primary", disabled=is_button_disabled):
            with st.spinner("Querying data... Please wait."):
                query = f"""
                    SELECT *
                    FROM read_parquet('{PARQUET_FILES_PATH}') 
                    WHERE DT_PAGAMENTO BETWEEN ? AND ? AND EMP = ? AND PRONT = ?
                    ORDER BY DT_PAGAMENTO ASC, EMP ASC
                """
                # Adjusting inputs to match database format (e.g., zero-padding)
                params = [start_date_emp, end_date_emp, company_filter.zfill(3), id_filter.zfill(10)]
                results_df = execute_query(query, params)
                
                if not results_df.empty:
                    report_info = {
                        "name": results_df['NOME'].iloc[0],
                        "company": company_filter, "matricula": id_filter,
                        "start_date": start_date_emp, "end_date": end_date_emp
                    }
                    display_results(results_df, report_info)
                else:
                    st.warning("No records found for the selected filters.")

# --- 5. HANDLING FAILED OR NO LOGIN ATTEMPT ---
elif st.session_state.get("authentication_status") is False:
    st.error('Incorrect username or password.')
elif st.session_state.get("authentication_status") is None:
    st.warning('Please enter your username and password.')
```

![desktop View](/assets/posts/2025-06-27/2.png)
_View of Streamlit app after login auth_

## 3. Project Conclusion
This project successfully replaced an unsupported legacy system with a modern, efficient data application, ensuring continued access to critical historical payroll data.

The core of the solution was a strategic combination of technologies. By migrating the data to Parquet files and using DuckDB as the query engine, we were able to deliver high-performance analytics directly on low-specification hardware, bypassing memory limitations. Streamlit provided the final piece, wrapping our backend logic in a secure and user-friendly web interface for the HR team.
