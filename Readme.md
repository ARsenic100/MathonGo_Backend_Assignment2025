# MathonGo Chapter Performance Dashboard API Backend

This is a Node.js backend for a Chapter Performance Dashboard API, built as an intern assignment. It provides RESTful endpoints for managing chapter data, with features like data filtering, pagination, caching (Redis), and rate limiting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Database Seeding](#database-seeding)
- [API Usage](#api-usage)

## Prerequisites

Make sure you have the following installed on your system:

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)
- MongoDB server (or access to a MongoDB Atlas cluster)
- Redis server (or access to a Redis instance)
- Postman (or any API testing tool)

## Setup

1.  **Clone the repository:**

    ```bash
# Clone the repository
git clone https://github.com/ARsenic100/MathonGo_Backend_Assignment2025.git

# Move into the project directory
cd MathonGo_Backend_Assignment2025

    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root directory of your project with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
ADMIN_API_KEY=your_secret_admin_api_key
PORT=3000 # Optional, default is 3000
```

-   Replace `your_mongodb_connection_string` with your MongoDB connection string (e.g., `mongodb://localhost:27017/mathongo` or your MongoDB Atlas connection string).
-   Replace `your_redis_connection_string` with your Redis connection string (e.g., `redis://localhost:6379`).
-   Replace `your_secret_admin_api_key` with a secure key for admin operations (like uploading data).

## Running the Project

To start the Express server, run the following command:

```bash
npm start
# or
node server.js
```

The server should start and listen on the port specified in your `.env` file (default is 3000).

## Database Seeding

To populate your MongoDB database with the initial chapter data from `all_subjects_chapter_data.json`, run the import script:

```bash
node importData.js
```

*Note: Ensure your MongoDB server is running and your `MONGODB_URI` is correctly set in the `.env` file before running this script.*

## API Usage

API endpoints can be tested using the provided Postman collection. Import the `MathonGo_API.postman_collection.json` file into Postman.

**Importing the Collection:**

1.  Open Postman.
2.  Click the `Import` button.
3.  Select the `MathonGo_API.postman_collection.json` file.

**Setting up Postman Environment:**

1.  In Postman, click on the `Environments` tab on the left sidebar.
2.  Click the `+` button to create a New Environment.
3.  Name the environment (e.g., "Development").
4.  Add the following variables:
    -   `base_url`: Your API base URL (e.g., `http://localhost:3000`)
    -   `admin_api_key`: The `ADMIN_API_KEY` you set in your `.env` file.
5.  Click `Save`.
6.  Select the newly created environment from the dropdown in the top right corner of Postman.

**Endpoints Included:**

-   **GET /api/v1/chapters**: Get all chapters with support for filtering (`class`, `unit`, `status`, `isWeakChapter`, `subject`), pagination (`page`, `limit`), and total count.
-   **GET /api/v1/chapters/:id**: Get a specific chapter by its MongoDB ID.
-   **POST /api/v1/chapters**: Upload chapters from a JSON file. This endpoint is admin-only and requires the `x-api-key` header set to your `admin_api_key`. It processes the JSON file, validates chapters, saves valid ones, and returns a list of any that failed validation.

Rate limiting (30 requests/minute per IP) and Redis caching (for `GET /api/v1/chapters`) are also implemented.
