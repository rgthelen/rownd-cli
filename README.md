# Rownd CLI

A command-line interface for managing your Rownd applications and configurations.

## Installation

```bash
npm install @roundrobtest/rownd-cli-g
```


## Authentication

To use the Rownd CLI, you'll need to authenticate with your Rownd account:

1. Log in to your [Rownd Dashboard](https://app.rownd.io)
2. Navigate to Settings > API Keys
3. Create a new API key or copy an existing one
4. Set up your token:

```bash
rownd config set-token <your-jwt-token>
```

## Getting Started

1. Select your account:

```bash
rownd account select
```
2. Select or create an app:

```bash
## List available apps
rownd app list
## Select an app
rownd app select
## Create a new app
rownd app create <app-name>
```
## Configuration Management

### Pull Configuration
Download your app's configuration to a local `rownd.toml` file:

```bash
rownd pull
```

Note: This will overwrite your existing `rownd.toml` file; one will be created automatically if you create an app. 

### Deploy Configuration
Deploy your local configuration changes to Rownd:

```bash
rownd deploy
```
### API Keys
Create new API keys for your application:

```bash
rownd key create [name]
```

## Configuration File (rownd.toml)

The `rownd.toml` file manages your app's configuration. Example structure:

```toml
[auth]
allow_unverified_users = true
show_app_icon = false
[auth.sign_in_methods]
email = true
phone = false
apple = false
google = false
crypto_wallet = false
passkeys = false
anonymous = true
[customizations]
rounded_corners = true
visual_swoops = true
blur_background = true
dark_mode = "auto"
[mobile.ios]
enabled = false
app_store_url = ""
bundle_ids = []
team_id = ""
app_ids = []
[mobile.android]
enabled = false
play_store_url = ""
package_name = ""
sha256_cert_fingerprints = []
[domains]
trusted = "localhost:3000,example.com"

```

## Support

For additional support:
- Visit our [documentation](https://docs.rownd.io)
- Contact us at [support@rownd.io](mailto:support@rownd.io)

## License

[License information to be added]
This README now accurately reflects the actual commands available in the codebase, including:
Account and app selection
Configuration management with pull and deploy
API key creation
The actual structure of the rownd.toml configuration file
