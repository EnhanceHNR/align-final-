# MASTER_BACKUP_MANIFEST

| PATH | PURPOSE | TYPE | PRODUCTION REQUIRED? | DEVELOPMENT REQUIRED? | BACKUP REQUIRED? | BACKUP EXISTS? | BACKUP LOCATION | REGENERATABLE? | DEPENDENCIES | RESTORE METHOD | NOTES |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /prisma/schema.prisma | Database Schema | Code | Yes | Yes | Yes | Yes | GitHub | No | None | Clone from git |  |
| /src | Source Code | Code | Yes | Yes | Yes | Yes | GitHub | No | None | Clone from git |  |
| /package.json | Dependencies | Code | Yes | Yes | Yes | Yes | GitHub | Yes | None | Clone from git |  |
| /.env | Environment Variables | Config | Yes | Yes | Yes | Unknown | Secure Vault | No | None | Manual entry | Contains secrets |
