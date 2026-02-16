# Messenger Reference

## Reliability checklist
- idempotent handlers
- retry strategy per message type
- failure transport configured
- dead letter replay process defined

## Commands
- `php bin/console messenger:consume`
- `php bin/console messenger:failed:show`
- `php bin/console messenger:failed:retry`
