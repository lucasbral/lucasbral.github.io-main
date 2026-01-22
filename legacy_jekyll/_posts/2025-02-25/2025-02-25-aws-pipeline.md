---
title: Creating A Small Data Pipeline Using Dynamodb And Lambda Functions On Aws 
description: >-
  In This Project We Will Create A Small Pipeline Inside The Aws Enviroment Using The Free Tier For Practicing Aws Tools.
date: 2025-02-25 00:00:00 +0800
categories: [Python, AWS, Lambda]
tags: [AWS]
image:
  path: /assets/posts/2025-02-25/aws.png
render_with_liquid: false
---

## Introduction

In This Project We Will Create A Small Pipeline Inside The Aws Enviroment Using The Free Tier For Practicing Aws Tools.

## 🚀 Project Overview  

- **Data Ingestion**: An **API Gateway** triggers a **Lambda function** to insert data into **DynamoDB**.  
- **Data Processing**: The function processes the data from an **HTTP request**.  
- **Scheduled Tasks**: An **EventBridge rule** triggers a **Lambda function** on a schedule (every day) to perform ]:  
  - Data processing 
- **Monitoring**: Use **CloudWatch** to monitor logs and set up basic alarms for:  
  - Failures  
  - Performance issues  


## 1 - DynamoDB

First, we will create a new DynamoDB table within the AWS Management Console.
Amazon **DynamoDB** is a fully managed **NoSQL database service** offered by AWS, designed for **high-performance, low-latency applications**. It provides **seamless scalability**, allowing you to handle large amounts of data with **consistent single-digit millisecond response times**.  

- Supports both **key-value** and **document** data structures, making it flexible for various use cases.  
- Offers features like:  
  - **Automatic scaling**  
  - **Backup and restore**  
  - **DynamoDB Streams** for real-time data processing  
- Being **serverless**, it eliminates the need for manual infrastructure management.  
- Ensures **high availability and security** by default. 

### 1.1 Acessing DynamoDB in AWS Console

In the search bar, type `DynamoDB` and select it from the results.

![desktop View](assets/posts/2025-02-25/1.png)
_Amazon Console UI_

In the DynamoDB page, select `Tables` from the navigation panel on the left and `Create Table` select id as hash , this is going to be our target vairable and we will set it as a number.

![desktop View](assets/posts/2025-02-25/2.png)
_Tables from DynamoDB_

![desktop View](assets/posts/2025-02-25/3.png)
_Create Table from DynamoDB_

### 1.2 Configuring Your DynamoDB Table  

Here, we will provide all the necessary information for our **DynamoDB table**.  

- In **Table name**, enter the name for your table (**ensure it follows AWS naming conventions**).  
- In **Partition key**, define the unique data attribute that will be used.  
  - In this case, it's the **ID**, configured as a **number**.  
- For **Table settings**, leave the **default options** as they are.  
- Then, select **Create table**.  

After that, we will be able to see our new table in the UI:

![desktop View](assets/posts/2025-02-25/4.png)
_Table Created in DynamoDB_

## 2 - Lambda Function

Now, we will create our Lambda function, which will be responsible for accessing the `API` and retrieving `JSON` data with the desired resources.

### 2.1 API Overview  

The API we will be using is available at [Yu-Gi-Oh! API Guide](https://ygoprodeck.com/api-guide/). This API returns all **Yu-Gi-Oh! cards** available at the time of the request.  

- The **Card Information** endpoint is available at:  
  [https://db.ygoprodeck.com/api/v7/cardinfo.php](https://db.ygoprodeck.com/api/v7/cardinfo.php)  

- It will return data in the following format:  

```json
{
  "data": [
    {
      "id": 6983839,
      "name": "Tornado Dragon",
      "type": "XYZ Monster",
      "frameType": "xyz",
      "desc": "2 Level 4 monsters\nOnce per turn (Quick Effect): You can detach 1 material from this card, then target 1 Spell/Trap on the field; destroy it.",
      "atk": 2100,
      "def": 2000,
      "level": 4,
      "race": "Wyrm",
      "attribute": "WIND",
      "card_sets": [
        {
          "set_name": "Battles of Legend: Relentless Revenge",
          "set_code": "BLRR-EN084",
          "set_rarity": "Secret Rare",
          "set_rarity_code": "(ScR)",
          "set_price": "4.08"
        },
        {
          "set_name": "Duel Devastator",
          "set_code": "DUDE-EN019",
          "set_rarity": "Ultra Rare",
          "set_rarity_code": "(UR)",
          "set_price": "1.4"
        },
        {
          "set_name": "Maximum Crisis",
          "set_code": "MACR-EN081",
          "set_rarity": "Secret Rare",
          "set_rarity_code": "(ScR)",
          "set_price": "4.32"
        }
      ],
      "card_images": [
        {
          "id": 6983839,
          "image_url": "https://images.ygoprodeck.com/images/cards/6983839.jpg",
          "image_url_small": "https://images.ygoprodeck.com/images/cards_small/6983839.jpg",
          "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/6983839.jpg"
        }
      ],
      "card_prices": [
        {
          "cardmarket_price": "0.42",
          "tcgplayer_price": "0.48",
          "ebay_price": "2.99",
          "amazon_price": "0.77",
          "coolstuffinc_price": "0.99"
        }
      ]
    }
  ]
}
```

This data will be returned for all available Yu-Gi-Oh! cards.

### 2.2 Creating Lambda Function

Now, we need to create the `Lambda function` responsible for making the `API request` and saving the data in `DynamoDB`.  

To do this:  
- Go to the `AWS Management Console`.  
- Type `Lambda` in the search bar.  
- Select `Lambda` from the results. 
- Select Create A Function

![desktop View](assets/posts/2025-02-25/5.png)
_Create Lambda Function_

### 2.2 Define the Lambda Function  

- **Author from Scratch**: Choose **Author from Scratch** to create a new Lambda function.  
- **Function Name**: Define a name for your function (e.g., `FetchYuGiOhCards`).  
- **Runtime**: Select **Python 3.13** as the runtime.  
- **Architecture**: Choose **ARM64** architecture (this is more cost-effective compared to `x86_64`).  
- **Execution Role**:  
  - Collapse the **default execution role** section.  
  - Select **Create a new role from AWS policy templates**.  
- **Role Name & Policy Templates**:  
  - Define a name for the role (e.g., `LambdaDynamoDBRole`).  
  - In the **Policy templates** section, choose templates related to **DynamoDB** (e.g., `AmazonDynamoDBFullAccess`). 
  - Select create function 


> - Depending on the processing time, you may need to increase the `timeout` and `memory` settings for your function. In my case, I set the `timeout` to 15 minutes** and `memory` to 500MB.  Be cautious, as increasing these settings **can lead to higher costs**. 
{: .prompt-tip }


![desktop View](assets/posts/2025-02-25/6.png)
_Lambda Function Settings_

### 2.3 Definig Python Code

Now, we need to define the Python code required to run our program.
You can either use the AWS Management Console’s built-in editor or upload your code from a local device.
In this case, we will use the requests library in Python, which is not included by default in AWS Lambda. Therefore, we need to import it manually.
So, we will create a new directory on my Linux Mint machine to begin the development process (or other device).


In this directory, we will create a file named `lambda_function.py`, which will contain our Python code for the Lambda function.
Since the **requests** library is not available by default in AWS Lambda, we need to install it manually. Open a terminal in your project directory and run the following command:

```bash
pip install requests -t .
```
- This installs the requests library 
- -t .: Specifies the target directory (. means the current directory from your project).

> - This is commonly used for AWS Lambda deployments, where you need to package dependencies in the same directory as your Lambda function before uploading it as a ZIP file.
{: .prompt-tip }

Now, your project directory should look something like this:  

```text
/my-lambda-project
│
├── lambda_function.py
├── requests/
├── requests-*.dist-info/
├── urllib3/
└── ...
```


### 2.4 Setting the Python Function

Our Python code will primarily use three libraries:  

- **requests** – Handles HTTP requests.  
- **boto3** – Manages AWS infrastructure.  
- **json** – Processes JSON data.  

The Python code is provided below:  


```python
import json
import boto3
import requests

# Initializes the DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('yugioh_cards_db')

def lambda_handler(event, context):
    # URL for the JSON API
    url = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes"
    
    # Make the request to fetch the data from the API
    try:
        response = requests.get(url)  # Send GET request to the URL
        response.raise_for_status()  # Check if the request was successful (status code 200)
        data = response.json()  # Parse the JSON response
        
        # Write data to DynamoDB using batch_writer for efficiency
        with table.batch_writer() as batch:
            for card in data['data']:  # Loop through each card in the response
                # Convert dictionary or list values to strings to avoid issues with DynamoDB storage
                item = {key: str(value) if isinstance(value, (dict, list)) else value for key, value in card.items()}
                batch.put_item(Item=item)  # Put each card as an item in the DynamoDB table
            
        return {
            'statusCode': 'ok',
            'body': 'success!'  # Return success message
        }

    # Handle any request-related errors
    except requests.exceptions.RequestException as e:
        return {
            'statusCode': 'error',
            'body': f'Error fetching data from API: {str(e)}'  # Return error message
        }
    
    # Handle any other general errors (e.g., DynamoDB write issues)
    except Exception as e:
        return {
            'statusCode': 'error',
            'body': f'Error writing to DynamoDB: {str(e)}'  # Return error message
        }

```
> - We use `table.batch_writer()` to optimize writes to DynamoDB by reducing the number of requests. However, make sure your IAM role has the necessary permissions; otherwise, the operation will fail with an error.  
{: .prompt-danger }

Now, zip all the folders and upload the archive to the AWS Lambda console.  

![desktop View](assets/posts/2025-02-25/9.png)
_Lambda Function Defined_

Select `Deploy` and Then `Test` 

#### 2.5 Testing Code

In the test menu Create any test and execute it.


![desktop View](assets/posts/2025-02-25/10.png)
_Lambda Function Test Return_

Our code is working! 🎉 Now, you can view the data in the DynamoDB console.  

In the search bar, type `DynamoDB` and select it from the results.

In the DynamoDB page, select `Explore Itens` and then your table.

You should see something like:

![desktop View](assets/posts/2025-02-25/11.png)
_DynamoDB table With Data_

As you can see, this is the information for Yu-Gi-Oh! cards—listing all available cards from the API.  

## 3 - EventBridge

Now that our pipeline is working, we need to set up scheduling to run every day at 10 AM. To achieve this, we will use **EventBridge**.  
Return to the Lambda Console and in you function select **Add trigger**


![desktop View](assets/posts/2025-02-25/12.png)
_Lambda Function Add trigger_

To configure the trigger, follow these steps:  

- Select **EventBridge (CloudWatch Events)**.  
- Choose **Create a new role**.  
- Set the **Rule Name** to `run_every_day`.  
- For **Rule Type**, select **Schedule Expression**.  
- In **Schedule Expression**, enter: `cron(0 10 * * ? *)`.  

![desktop View](assets/posts/2025-02-25/13.png)
_Lambda Function Add trigger Settings_

Select `add` 

Finally, our project is fully configured to run **automatically every day at 10 AM**, updating the **DynamoDB database** with the latest **Yu-Gi-Oh! cards** from the API. 🚀  

![desktop View](assets/posts/2025-02-25/14.png)
_Pipeline With All Steps_

## Conclusions 

We successfully built a fully functional **AWS Lambda pipeline** that fetches **Yu-Gi-Oh! card data** from an API and stores it in **DynamoDB**.  

### Summary of What We Accomplished:  
- **Set up a Lambda function** to request data from the API and write it to DynamoDB.  
- **Configured IAM roles and permissions** to ensure proper access.  
- **Optimized database writes** using `batch_writer()`.  
- **Verified data storage** by checking the DynamoDB console.  
- **Automated execution** using **EventBridge** to run the function daily at **10 AM UTC**.  

With this setup, our pipeline ensures that our DynamoDB table stays updated with the latest card data every day. 🚀  

