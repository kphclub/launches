# Hackathon API Specs

## Get Projects
```
GET /api/hackathon/launches?edition=2026
GET /api/hackathon/launches?messageId=<message_id>
```

Returns hackathon projects sorted by popularity (reactions).

- `edition`: hackathon year. Defaults to `2025` so older pages keep working.
- `messageId`: returns that single project, whatever its edition.

**Response:**
```json
{
  "launches": [
    {
      "name": "Project Name",
      "description": "Project description",
      "link": "https://project-url.com",
      "category": "AI",
      "edition": "2026",
      "memberName": "Creator Name",
      "reactionCount": 15,
      "message_id": "wamid.12345",
      "created_at": "2025-09-20T10:30:00.000Z"
    }
  ]
}
```

## Get Replies
```
GET /api/hackathon/replies/:messageId
```

Returns comments for a specific project.

**Response:**
```json
{
  "replies": [
    {
      "message": "Great project!",
      "memberName": "Commenter Name",
      "created_at": "2025-09-20T11:15:00.000Z"
    }
  ]
}
```

## Usage
1. Call `/api/hackathon/launches?edition=2026` to get that year's projects
2. Use `message_id` from project to get replies: `/api/hackathon/replies/{message_id}`
3. Projects are pre-sorted by `reactionCount` (most popular first)
