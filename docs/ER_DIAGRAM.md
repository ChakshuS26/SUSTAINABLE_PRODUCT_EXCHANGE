# ER Diagram (rubric: ER diagram — 2 marks)

Renders automatically on GitHub. To get a PNG/PDF for your report, paste the block into <https://mermaid.live> and export.

```mermaid
erDiagram
    USERS ||--o{ PRODUCTS : "lists"
    CATEGORIES ||--o{ PRODUCTS : "classifies"
    CATEGORIES |o--o{ CATEGORIES : "parent of"
    PRODUCTS ||--o{ EXCHANGE_REQUESTS : "receives"
    USERS ||--o{ EXCHANGE_REQUESTS : "makes"
    PRODUCTS |o--o{ EXCHANGE_REQUESTS : "offered in return"
    EXCHANGE_REQUESTS ||--o| TRANSACTIONS : "completes into"
    PRODUCTS ||--o{ TRANSACTIONS : "is subject of"
    USERS ||--o{ TRANSACTIONS : "gives / receives"
    TRANSACTIONS ||--o{ REVIEWS : "is reviewed by"
    USERS ||--o{ REVIEWS : "writes / receives"

    USERS {
        int user_id PK
        string name
        string email UK
        string password_hash
        string role "user | admin"
        string city
        string phone
        timestamp created_at
    }
    CATEGORIES {
        int category_id PK
        string name UK
        int parent_id FK "self reference"
    }
    PRODUCTS {
        int product_id PK
        int owner_id FK
        int category_id FK
        string title
        text description
        string item_condition "new | like_new | good | fair"
        string listing_type "sell | exchange | donate"
        decimal price
        string status "available | reserved | completed"
        timestamp created_at
    }
    EXCHANGE_REQUESTS {
        int request_id PK
        int product_id FK
        int requester_id FK
        int offered_product_id FK "nullable"
        text message
        string status "pending|accepted|rejected|cancelled|completed"
        timestamp created_at
    }
    TRANSACTIONS {
        int txn_id PK
        int request_id FK,UK
        int product_id FK
        int giver_id FK
        int receiver_id FK
        string txn_type
        decimal amount
        timestamp completed_at
    }
    REVIEWS {
        int review_id PK
        int txn_id FK
        int reviewer_id FK
        int reviewee_id FK
        int rating "1 to 5"
        text comment
    }
    AUDIT_LOG {
        int log_id PK
        string table_name
        string action
        int row_id
        text details
        timestamp logged_at
    }
```

## MongoDB document (NoSQL side)

Collection `product_details` — one document per product, linked by `product_id`:

```json
{
  "product_id": 5,
  "tags": ["laptop", "student"],
  "attributes": { "brand": "Dell", "ram_gb": 8, "storage": "256GB SSD" },
  "images": [],
  "pickup": { "city": "Mumbai", "availability": ["weekends"] },
  "impact": { "co2_saved_kg": 40, "waste_diverted_kg": 2.2 },
  "notes": [ { "_id": "…", "by_user_id": 4, "by_name": "Ravi", "text": "Can I test it?", "at": "…" } ],
  "created_at": "…", "updated_at": "…"
}
```
