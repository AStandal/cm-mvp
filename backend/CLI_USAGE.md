# Dataset Management CLI

This CLI provides commands for managing evaluation datasets from the command line.

## Available Commands

### Create Dataset

Create a new evaluation dataset:

```bash
npm run eval:create-dataset -- --name "My Dataset" --operation generate_summary --user john.doe --description "Dataset for testing summaries"
```

**Options:**
- `-n, --name <name>` - Dataset name (required)
- `-o, --operation <operation>` - AI operation type (required)
  - Valid operations: `generate_summary`, `generate_recommendation`, `analyze_application`, `generate_final_summary`, `validate_completeness`, `detect_missing_fields`
- `-u, --user <user>` - Created by user (required)
- `-d, --description <description>` - Dataset description (optional)
- `-t, --tags <tags>` - Comma-separated tags (optional)
- `--difficulty <difficulty>` - Difficulty level: `easy`, `medium`, `hard` (default: medium)
- `--source <source>` - Source type: `manual`, `captured_interactions`, `synthetic` (default: manual)

**Example:**
```bash
npm run eval:create-dataset -- --name "Case Summary Dataset" --operation generate_summary --user alice --description "Dataset for case summary evaluation" --tags "summary,cases,evaluation" --difficulty medium
```

### List Datasets

List all evaluation datasets with optional filtering:

```bash
npm run eval:list-datasets
```

**Options:**
- `-o, --operation <operation>` - Filter by operation
- `-u, --user <user>` - Filter by created by user
- `-t, --tags <tags>` - Filter by tags (comma-separated)
- `-l, --limit <limit>` - Limit number of results (default: 10)
- `--detailed` - Show detailed information including examples

**Examples:**
```bash
# List all datasets
npm run eval:list-datasets

# List datasets by operation
npm run eval:list-datasets -- --operation generate_summary

# List datasets by user with detailed info
npm run eval:list-datasets -- --user alice --detailed

# List datasets with specific tags
npm run eval:list-datasets -- --tags "summary,evaluation"
```

### Get Dataset Details

Get detailed information about a specific dataset:

```bash
npm run eval:get-dataset -- <dataset-id>
```

**Example:**
```bash
npm run eval:get-dataset -- 550e8400-e29b-41d4-a716-446655440000
```

### Add Example from File

Add an example to a dataset from a JSON file:

```bash
npm run eval:add-example -- --dataset <dataset-id> --file <path-to-json-file>
```

**Options:**
- `-d, --dataset <id>` - Dataset ID (required)
- `-f, --file <file>` - JSON file containing example data (required)

**Example:**
```bash
npm run eval:add-example -- --dataset 550e8400-e29b-41d4-a716-446655440000 --file examples/example-template.json
```

### Add Example Interactively

Add an example to a dataset using command line options:

```bash
npm run eval:add-example-interactive -- --dataset <dataset-id> --prompt "Your prompt" --content "Expected content" --quality 8
```

**Options:**
- `-d, --dataset <id>` - Dataset ID (required)
- `-p, --prompt <prompt>` - Input prompt (required)
- `-c, --content <content>` - Expected output content (required)
- `-q, --quality <quality>` - Quality score 1-10 (required)
- `--faithfulness <score>` - Faithfulness score 1-10 (default: 5)
- `--completeness <score>` - Completeness score 1-10 (default: 5)
- `--relevance <score>` - Relevance score 1-10 (default: 5)
- `--clarity <score>` - Clarity score 1-10 (default: 5)
- `-t, --tags <tags>` - Comma-separated tags (optional)
- `--difficulty <difficulty>` - Difficulty level: `easy`, `medium`, `hard` (default: medium)
- `-n, --notes <notes>` - Additional notes (optional)

**Example:**
```bash
npm run eval:add-example-interactive -- --dataset 550e8400-e29b-41d4-a716-446655440000 --prompt "Generate a summary for this case" --content "This is a comprehensive summary" --quality 9 --faithfulness 9 --completeness 8 --relevance 9 --clarity 8 --tags "summary,high-quality" --difficulty medium --notes "Excellent example"
```

### Generate Example Template

Generate a template JSON file for adding examples:

```bash
npm run eval:example-template -- --output <output-file>
```

**Options:**
- `-o, --output <file>` - Output file path (required)

**Example:**
```bash
npm run eval:example-template -- --output my-example-template.json
```

## Example JSON File Format

When using `--file` option, the JSON file should have this structure:

```json
{
  "input": {
    "prompt": "Generate a summary for this case",
    "context": {
      "caseType": "application",
      "priority": "high"
    }
  },
  "expectedOutput": {
    "content": "This is the expected output content",
    "quality": 8,
    "criteria": {
      "faithfulness": 9,
      "completeness": 8,
      "relevance": 8,
      "clarity": 7
    }
  },
  "metadata": {
    "tags": ["test", "example"],
    "difficulty": "medium",
    "notes": "This is a template example"
  }
}
```

## Common Workflows

### 1. Create a new dataset and add examples

```bash
# Create dataset
npm run eval:create-dataset -- --name "My Test Dataset" --operation generate_summary --user john.doe

# Get the dataset ID from the output, then add examples
npm run eval:add-example-interactive -- --dataset <dataset-id> --prompt "Test prompt" --content "Test content" --quality 7

# Or add from file
npm run eval:example-template -- --output template.json
# Edit template.json with your data
npm run eval:add-example -- --dataset <dataset-id> --file template.json
```

### 2. Review existing datasets

```bash
# List all datasets
npm run eval:list-datasets

# Get detailed info about a specific dataset
npm run eval:get-dataset -- <dataset-id>

# List datasets with examples
npm run eval:list-datasets -- --detailed
```

### 3. Filter and search datasets

```bash
# Find datasets by operation
npm run eval:list-datasets -- --operation generate_summary

# Find datasets by user
npm run eval:list-datasets -- --user alice

# Find datasets with specific tags
npm run eval:list-datasets -- --tags "summary,evaluation"
```

## Error Handling

The CLI provides helpful error messages for common issues:

- **Invalid operation**: Lists valid operations
- **Invalid difficulty**: Lists valid difficulty levels
- **File not found**: Clear error message with file path
- **Invalid JSON**: JSON parsing error details
- **Dataset not found**: Clear error message with dataset ID
- **Invalid quality scores**: Validation error for scores outside 1-10 range

## Tips

1. **Use quotes** for names and descriptions with spaces
2. **Copy dataset IDs** from the create or list commands
3. **Generate templates** first to understand the JSON structure
4. **Use filtering** to find specific datasets quickly
5. **Use detailed mode** to see examples in datasets