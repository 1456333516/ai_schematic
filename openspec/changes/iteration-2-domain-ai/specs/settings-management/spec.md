# Settings Management Specification

## ADDED Requirements

### Requirement: Settings dialog UI
The system SHALL provide a settings dialog accessible from the main UI.

#### Scenario: Open from gear icon
- **WHEN** the user clicks the gear icon in the UI
- **THEN** the settings dialog opens as a modal

#### Scenario: Dialog sections
- **WHEN** the settings dialog is open
- **THEN** it displays sections for API Key and other settings

### Requirement: API key input
The system SHALL provide a secure input field for the Claude API key.

#### Scenario: Password field
- **WHEN** the API key input is displayed
- **THEN** it uses password-type input to hide the key

#### Scenario: Show/hide toggle
- **WHEN** the user clicks the show/hide icon
- **THEN** the API key visibility toggles between hidden and visible

#### Scenario: Validation on input
- **WHEN** the user types in the API key field
- **THEN** basic format validation is performed (starts with "sk-ant-")

### Requirement: API key storage
The system SHALL securely store the API key using Electron safeStorage.

#### Scenario: Save to safeStorage
- **WHEN** the user saves the API key
- **THEN** it is encrypted using Electron safeStorage and written to disk

#### Scenario: Load from safeStorage
- **WHEN** the application starts
- **THEN** the API key is decrypted from safeStorage if it exists

#### Scenario: Platform-specific encryption
- **WHEN** safeStorage encrypts the key
- **THEN** it uses the OS keychain (macOS), DPAPI (Windows), or libsecret (Linux)

### Requirement: Test connection
The system SHALL provide a way to test the API key validity.

#### Scenario: Test button
- **WHEN** the user enters an API key
- **THEN** a "Test Connection" button is enabled

#### Scenario: Successful test
- **WHEN** the user clicks "Test Connection" with a valid key
- **THEN** a success message is displayed

#### Scenario: Failed test
- **WHEN** the user clicks "Test Connection" with an invalid key
- **THEN** an error message is displayed with the failure reason

### Requirement: Auto-open on error
The system SHALL automatically open the settings dialog when API key errors occur.

#### Scenario: 401 error handling
- **WHEN** the Claude API returns a 401 error
- **THEN** the settings dialog opens with an error message "Invalid API key"

#### Scenario: 403 error handling
- **WHEN** the Claude API returns a 403 error
- **THEN** the settings dialog opens with an error message "API key lacks required permissions"

#### Scenario: Focus API key field
- **WHEN** the settings dialog auto-opens due to an error
- **THEN** the API key input field is automatically focused

### Requirement: Other settings
The system SHALL provide UI for other application settings.

#### Scenario: Grid size setting
- **WHEN** the settings dialog is open
- **THEN** it displays a grid size input (reserved for future use)

#### Scenario: Auto-save interval
- **WHEN** the settings dialog is open
- **THEN** it displays an auto-save interval input (reserved for future use)

### Requirement: Settings persistence
The system SHALL persist all settings to disk.

#### Scenario: Save settings
- **WHEN** the user clicks "Save" in the settings dialog
- **THEN** all settings are written to a settings.json file

#### Scenario: Load settings
- **WHEN** the application starts
- **THEN** settings are loaded from settings.json if it exists

#### Scenario: Default values
- **WHEN** no settings file exists
- **THEN** default values are used for all settings
