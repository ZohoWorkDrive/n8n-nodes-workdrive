# n8n-nodes-workdrive

This is an n8n community node for **Zoho WorkDrive**. It lets you manage files, folders, and automate workflows triggered by WorkDrive events.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### WorkDrive (regular node)

**Files**
- Upload a file
- Download a file
- Get file metadata
- Rename a file
- Move a file
- Copy a file
- Trash a file
- Delete a file permanently

**Folders**
- Create a folder
- Get folder details
- List folder contents
- Rename a folder
- Move a folder
- Trash a folder

**Sharing & Links**
- Share a file or folder with a user
- Update sharing permissions
- Remove sharing
- Create an external share link
- Update or delete an external share link

### WorkDrive Trigger (webhook node)

Starts a workflow when a Zoho WorkDrive event occurs. Supports four webhook categories:

- **File** — events on a specific file (view, rename, move, trash, restore, delete, download, copy, share, comments, external links)
- **Folder** — file and folder events inside a specific folder and its subfolders
- **Team Folder** — file, folder, and member events inside a specific team folder
- **Team** — team-wide membership and structure events (user added/removed/role updated, team folder created, team renamed)

> WorkDrive webhooks require the **Business plan**. Webhooks are not available on Free or Standard plans.

## Credentials

Zoho WorkDrive uses **OAuth2**. The credential supports all Zoho data centre regions:

| Region | Auth URL |
|---|---|
| US / Global | accounts.zoho.com |
| Europe | accounts.zoho.eu |
| India | accounts.zoho.in |
| Australia | accounts.zoho.com.au |
| Canada | accounts.zohocloud.ca |
| Japan | accounts.zoho.jp |

### Setting up OAuth2

1. Go to [Zoho API Console](https://api-console.zoho.com/) and create a **Server-based Application**.
2. Add the n8n OAuth callback URL as the redirect URI.
3. Note the **Client ID** and **Client Secret**.
4. In n8n, create a **Zoho WorkDrive OAuth2 API** credential, select your region, and enter the Client ID and Secret.
5. Connect the credential — you will be redirected to Zoho to authorise access.

### Setting up webhooks (WorkDrive Trigger)

Webhooks in WorkDrive must be registered manually in the **Admin Console**:

1. Go to WorkDrive **Admin Console → Apps → Custom Apps → your app → Webhooks**.
2. Create a new webhook, paste the **Production URL** from the n8n trigger node, select the category and events.
3. WorkDrive sends a GET request to validate the endpoint — the trigger node handles this automatically.
4. Once validated the webhook status changes to **Active**.

See the [WorkDrive webhook documentation](https://help.zoho.com/portal/en/kb/workdrive/integrations/webhooks/articles/setting-up-webhooks-in-workdrive-using-custom-apps) for full setup instructions.

## Compatibility

Tested with n8n 1.60.0 and later.

Requires a Zoho WorkDrive account. Webhook triggers require the Business plan.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Zoho WorkDrive API documentation](https://workdrive.zoho.com/apidocs/v1)
- [WorkDrive webhook events reference](https://help.zoho.com/portal/en/kb/workdrive/integrations/webhooks/articles/webhooks-trigger-events-available-in-workdrive)
- [Zoho API Console](https://api-console.zoho.com/)
