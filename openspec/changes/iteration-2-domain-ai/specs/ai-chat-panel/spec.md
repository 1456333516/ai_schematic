# AI Chat Panel Specification

## ADDED Requirements

### Requirement: Message list display
The system SHALL display a scrollable list of user and AI messages in the chat panel.

#### Scenario: User message display
- **WHEN** the user sends a message
- **THEN** it appears in the message list with user styling

#### Scenario: AI message display
- **WHEN** the AI responds
- **THEN** it appears in the message list with AI styling

#### Scenario: Auto-scroll
- **WHEN** a new message is added
- **THEN** the message list automatically scrolls to the bottom

#### Scenario: Markdown rendering
- **WHEN** an AI message contains markdown
- **THEN** it is rendered with proper formatting (bold, italic, code blocks, etc.)

### Requirement: Streaming UI
The system SHALL display AI responses incrementally as they are streamed.

#### Scenario: Streaming text
- **WHEN** AI text chunks are received
- **THEN** they are appended to the current AI message in real-time

#### Scenario: Streaming tool calls
- **WHEN** tool call chunks are received
- **THEN** a progress indicator shows the current tool being executed

#### Scenario: Smooth updates
- **WHEN** streaming updates occur
- **THEN** the UI updates at most once per animation frame to prevent jank

### Requirement: Progress indicators
The system SHALL show visual feedback during AI generation.

#### Scenario: Generation in progress
- **WHEN** AI is generating a schematic
- **THEN** a progress bar or spinner is displayed

#### Scenario: Current operation display
- **WHEN** a tool call is being executed
- **THEN** the UI shows "Adding R1..." or similar operation-specific text

#### Scenario: Component count
- **WHEN** components are being added
- **THEN** the UI shows "Added 3 of 10 components"

### Requirement: Stop button
The system SHALL allow users to interrupt AI generation.

#### Scenario: Stop button visibility
- **WHEN** AI generation is in progress
- **THEN** a stop button is visible and enabled

#### Scenario: Stop generation
- **WHEN** the user clicks the stop button
- **THEN** the streaming request is aborted and no further tool calls are executed

#### Scenario: Partial results
- **WHEN** generation is stopped
- **THEN** components added before stopping remain on the canvas

### Requirement: Error handling
The system SHALL display clear error messages when AI requests fail.

#### Scenario: API error display
- **WHEN** the Claude API returns an error
- **THEN** an error message is displayed in the chat with the error type

#### Scenario: Retry button
- **WHEN** an error occurs
- **THEN** a retry button is displayed to resend the request

#### Scenario: API key invalid
- **WHEN** a 401 or 403 error occurs
- **THEN** the settings dialog automatically opens with an error message

### Requirement: Input field
The system SHALL provide a text input for user messages.

#### Scenario: Multi-line input
- **WHEN** the user types in the input field
- **THEN** it expands vertically to accommodate multiple lines

#### Scenario: Send on Enter
- **WHEN** the user presses Enter
- **THEN** the message is sent (Shift+Enter for new line)

#### Scenario: Disabled during generation
- **WHEN** AI generation is in progress
- **THEN** the input field is disabled to prevent concurrent requests

### Requirement: Conversation history
The system SHALL persist conversation history with the project.

#### Scenario: Save on message
- **WHEN** a message is sent or received
- **THEN** it is saved to the project's conversation history file

#### Scenario: Load on project open
- **WHEN** a project is opened
- **THEN** the conversation history is loaded and displayed in the chat panel

#### Scenario: Clear history
- **WHEN** the user clears the conversation
- **THEN** all messages are removed from the UI and the history file
