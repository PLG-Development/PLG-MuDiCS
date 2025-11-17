# API

All response and request bodies are `application/json` if not otherwise specified. If no response schema is specified an empty json object `{}` is returned.

## Default

### Responses

#### _General Error_

- `description`: string

#### 400

Request uses invalid JSON syntax or does not follow request schema.

#### 500

Something (undefined) on the display side has gone very wrong.

## GET `/ping`

### Responses

#### 200

- `version`: str

## PATCH `/shellCommand`

### Responses

#### 200

Even when the command itself fails.

- `stdout`: string
- `stderr`: string
- `exitCode`: int

## PATCH `/keyboardInput`

### Request Body

- `key`: string for key
- `action`: "press" or "release"

## PATCH `/showHTML`

### Request Body

- `html`: string

## PATCH `/takeScreenshot`

### Responses

#### 200

The screenshot as binary in the response body.

## POST `/file/<path>` - Upload File

### Responses

#### 409 - Conflict

File with the same path and name already exists.

## GET `/file/<path>`

### Responses

#### 404

Requested file was not found at the path.

## PATCH `/file/<path>` - Open File

### Responses

#### 404

Requested file was not found at the path.

#### 415 - Unsupported Media Type

The type of the file is not available for display.

## GET `/file/preview/<path>`

### Responses

#### 404

Requested file was not found at the path.

#### 415 - Unsupported Media Type

The type of the file is not available preview generation.
