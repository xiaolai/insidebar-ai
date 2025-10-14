# Generate a Basic Prompt Library

## Three Most Powerful Foundational Prompts

> * Rewrite the following prompt in clear, natural English and enhance it using AI prompt-writing best practices to ensure more accurate, specific, and useful results. Prompt: {draft}
> * List as many relevant items, examples, or ideas as possible related to the following topic or question. Aim for completeness, accuracy, and clarity. Topic: {topic}
> * What are the most effective frameworks, methods, or models to {objective}? For each framework, explain its core idea, advantages, and when it is best applied.

You can import these using the file path: `data/prompt-libraries/three-samples.json`


## Generate a New Prompt Library

Use the following prompt to generate a Prompt Library that can be directly imported into this plugin.

>Generate 20 of the most effective and high-quality prompts you’ve recently encountered or created. Each prompt should be especially insightful, creative, or educational — valuable for learning or inspiration.
>
>Provide each result in the following JSON structure:
>
>```json
>{
>  "title": "Short descriptive title of the prompt",
>  "content": "Full text of the prompt. Use {variables} for any placeholders.",
>  "category": "General theme or purpose of the prompt (e.g., Writing, Analysis, Creativity)",
>  "tags": ["tag1", "tag2"],
>  "variables": ["{variables used}"],
>  "isFavorite": false,
>  "useCount": 0,
>  "lastUsed": null
>}
>```
>
>Make sure each JSON object is self-contained, clearly written, and formatted for easy parsing.