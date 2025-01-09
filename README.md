# Rownd CLI (MVP)

A command-line interface for managing your Rownd applications, configurations, and demos.

## Installation

```bash
npm install @roundrobtest/rownd-cli -g
```

## Authentication & Configuration

To use the Rownd CLI, you'll need to authenticate and configure:

1. Log in to your [Rownd Dashboard](https://app.rownd.io)
2. Navigate to Settings > API Keys
3. Create a new API key or copy an existing one
4. Set up your tokens:

```bash
# Set authentication tokens
rownd config set-token <your-jwt-token>
rownd config set-refresh-token <your-refresh-token>

# Set analyzer configuration (contact support@rownd.io for credentials)
rownd config set-analyzer-url <analyzer-url>
rownd config set-analyzer-key <analyzer-key>
rownd config set-analyzer-secret <analyzer-secret>

# Verify configuration
rownd config show
```

## Quick Start: Create a Demo

Create a complete demo from any website:

```bash
rownd bootstrap-demo -w https://example.com -n "My Demo App" --logo
```

This will:
- Create a new Rownd app
- Analyze the website
- Configure the app based on analysis
- Create a demo site
- Upload detected logo (if --logo flag is used)

## Website Analysis

Analyze a website and configure your Rownd app:

```bash
rownd analyze -w https://example.com -n "My Analysis" --logo
```

## Demo Creation

Create a demo using an existing Rownd app:

```bash
rownd create-demo -w https://example.com
```
Requires `ROWND_APP_KEY` in `.env` file or environment.

## Account and App Management

```bash
# Account management
rownd account list                    # List available accounts
rownd account select                  # Interactive account selection

# App management
rownd app create "My New App"         # Create new app
rownd app list                        # List apps in account
rownd app select                      # Interactive app selection
rownd app pull                        # Pull app config
rownd app deploy [-j config.json]     # Deploy config
```

## Logo Management

Upload logos to your Rownd app:

```bash
rownd upload-image <path> -t <type>
```
Options:
- `<path>`: Local file path or URL
- `-t, --type`: Required - one of: light | dark | email

Examples:
```bash
rownd upload-image ./logo.png -t light
rownd upload-image https://example.com/logo.svg -t dark
```

## Configuration Management

### Analyzer Configuration
The website analyzer requires specific credentials. Contact support@rownd.io to obtain your analyzer credentials.

```bash
# Set analyzer endpoint
rownd config set-analyzer-url <url>

# Set analyzer credentials
rownd config set-analyzer-key <key>
rownd config set-analyzer-secret <secret>

# Verify configuration
rownd config show
```

Example:
```bash
rownd config set-analyzer-url "https://website-analyzer.fly.dev"
rownd config set-analyzer-key "your-analyzer-key"
rownd config set-analyzer-secret "your-analyzer-secret"
```

### Pull Configuration
Download your app's configuration:

```bash
rownd pull
```

### Deploy Configuration
Deploy your local configuration:

```bash
rownd deploy
```

### API Keys
Create new API keys:

```bash
rownd key create [name]
```

## Configuration File (rownd.toml)

Example structure:

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
