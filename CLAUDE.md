## RULES - ALWAYS FOLLOW
- grep first, never read whole files
- fix only what's broken, nothing else
- no explanations, just do it
- commit after each fix

## CURRENT BUG
path.join crash at server startup
import.meta.dirname is undefined on Railway/Node18

## FIX PATTERN
Replace: import.meta.dirname
With: (import.meta.dirname ?? new URL('.', import.meta.url).pathname)
