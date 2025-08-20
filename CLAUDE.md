# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Apps Script project that automates PDF generation from Google Spreadsheet data, creates AI summaries using Gemini API, and sends them via email. The system supports automated execution with comprehensive error handling and performance monitoring.

## Architecture

The codebase follows a modular architecture with distinct responsibilities:

**Core Processing Flow:**
- `main.gs` → `documentProcessor.gs` → `geminiAPI.gs` / `emailSender.gs`
- Configuration managed centrally through `config.gs`
- All operations logged via `logger.gs`

**Key Components:**
- **DocumentProcessor** (`documentProcessor.gs`): Main processing engine with batch execution
- **GeminiAPI** (`geminiAPI.gs`): AI text summarization with cost optimization
- **EmailSender** (`emailSender.gs`): Multi-mode email delivery (consolidated/individual/errors-only)
- **ConfigManager** (`config.gs`): Dynamic configuration with validation
- **Logger** (`logger.gs`): Structured logging with error categorization
- **TriggerManager** (`triggerManager.gs`): Automated scheduling system
- **PerformanceAnalyzer** (`performanceAnalyzer.gs`): System monitoring and benchmarking
- **TextOptimizer** (`textOptimizer.gs`): Text processing for API limits

## Development Commands

This project uses Google Apps Script and doesn't have traditional build commands. Development is done through the Apps Script editor or CLI tools.

**Setup Functions (run once):**
```javascript
// For UI setup from spreadsheet
setupInitialConfiguration()

// For headless setup from script editor  
setupInitialConfigurationHeadless()
```

**Configuration Management:**
```javascript
// Validate current settings
ConfigManager.validate()

// Reset to defaults
ConfigManager.resetToDefaults()

// Set API key
setGeminiApiKey()

// Set email recipients
setEmailRecipients()
```

**Testing and Monitoring:**
```javascript
// Run performance benchmark
PerformanceAnalyzer.runBenchmark(5)

// System health check
PerformanceAnalyzer.getSystemHealthReport()

// Export detailed analysis
PerformanceAnalyzer.exportDetailedAnalysis()
```

## Configuration Requirements

**Required Properties (set in Script Properties):**
- `GEMINI_API_KEY`: API key from Google AI Studio
- `MAIL_TO`: Email recipients (comma-separated)
- `MAIL_SUBJECT`: Email subject line

**Key Configuration Constants (config.gs):**
- `CONFIG.EXECUTION.MAX_TIME_MS`: Script timeout (4 minutes default)
- `CONFIG.EXECUTION.BATCH_SIZE`: Sheets processed per batch (3 default)
- `CONFIG.EMAIL_MODE`: Email sending strategy (CONSOLIDATED/INDIVIDUAL/ERRORS_ONLY)
- `CONFIG.TEXT.MAX_TEXT_LENGTH`: API text limit (8000 chars default)

## Email Modes

The system supports three email delivery strategies:

1. **CONSOLIDATED** (recommended): All PDFs in single email
2. **INDIVIDUAL**: Each sheet as separate email  
3. **ERRORS_ONLY**: Only send error reports

Mode can be changed via spreadsheet menu or `ConfigManager.setEmailMode()`.

## Error Handling System

Comprehensive error categorization in `errorHandler.gs`:
- **TEMPORARY**: Retry with exponential backoff
- **RATE_LIMIT**: Handle API quotas with smart delays
- **PERMISSION**: API access issues
- **NETWORK**: Connection problems
- **VALIDATION**: Data format issues

All errors are logged to dedicated ErrorLog sheet with automatic cleanup.

## Performance Characteristics

**Execution Limits:**
- Google Apps Script: 6-minute maximum runtime
- Gmail: 100 emails/day limit
- Gemini API: Rate limiting applies

**Optimization Features:**
- Dynamic batch sizing based on sheet count
- Text preprocessing for API efficiency
- Memory management for large datasets
- Automatic retry with exponential backoff

## Testing Approach

No traditional unit tests. Testing done via:
- Built-in configuration validation (`ConfigManager.validate()`)
- Performance benchmarking (`PerformanceAnalyzer.runBenchmark()`)
- System health monitoring (`getSystemHealthReport()`)
- Manual execution modes in spreadsheet menu

## Common Development Patterns

**Adding New Functionality:**
1. Define constants in `CONFIG` object
2. Add validation in `ConfigManager.validateConfigValues()`
3. Use `Logger.info/error()` for all operations
4. Implement error handling with appropriate `ERROR_TYPES`
5. Add UI menu item in `main.gs` if user-facing

**Configuration Changes:**
- Always use `ConfigManager` methods
- Validate inputs in `validateConfigValues()`
- Log configuration changes
- Update `DEFAULT_VALUES` for new settings

**Performance Considerations:**
- Use `PerformanceAnalyzer.startPerformanceMonitoring()` for new features
- Implement batch processing for operations on multiple items
- Consider memory usage for large text processing
- Add appropriate delays for API calls