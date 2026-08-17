# 00 Non-Technical Project Overview

## 3.1 What is this project?
This project is an internal management system named Aligne. It manages patients, appointments, treatments, invoicing, laboratory submissions, inventory, human resources, and learning materials for a dental practice.

## 3.2 How does the project work?
1. User logs into the web application.
2. The application verifies their identity.
3. The user interacts with the dashboard.
4. Information is saved to the central database.
5. Files are stored in Firebase Storage.
6. The application retrieves and displays the required information.

## 3.3 What happens when a user uses the application?
Staff can manage patients, schedule appointments, track treatments, generate invoices, manage inventory, and track lab submissions. Managers can oversee employee attendance, payroll, and lab transactions.

## 3.4 Who uses the system?
- **Staff**: Can perform daily operational tasks.
- **Master/Admin**: Has full access, including employee profiles, payroll, and system settings.

## 3.5 What does each system component do?
- **Application**: The web interface users see. Runs in the cloud.
- **Database**: Stores all text data. PostgreSQL based.
- **File Storage**: Stores images and documents. Firebase based.
- **Authentication**: Ensures only authorized users access the system. NextAuth based.
- **Docker**: Used to run the database locally for development.
- **GitHub**: Where the source code is kept safely.

## 3.6 Where is everything?
- Source Code: GitHub
- Application: Cloud hosting
- Database: PostgreSQL
- Files: Firebase Storage
- Backups: Configured for the PostgreSQL database.

## 3.7 How the system runs every day
- Automatic: Cloud hosting keeps the app online. Database runs continuously.
- Manual: Staff must input data. Admin should periodically verify backups.

## 3.8 What happens if something goes wrong?
- Website does not open: Check hosting provider status.
- User cannot log in: Verify authentication secrets.
- Data does not save: Database might be down or out of space.
- File does not upload: Firebase might be unreachable.

## 3.9 What is critical?
- The PostgreSQL Database
- Firebase Storage
- The .env configuration file
- GitHub Source Code.

## 3.10 What happens if the developer disappears?
The source code is safe in GitHub. The database is in the cloud provider. Another developer can clone the repo, restore the database from backups, set up the environment variables, and re-deploy.

## 3.11 How a new owner takes over
1. Obtain GitHub access.
2. Obtain Cloud Hosting access.
3. Obtain Database hosting access.
4. Obtain Firebase access.
5. Verify backups.

## 3.12 Simple One-Page Architecture
USER -> WEBSITE -> BACKEND -> DATABASE + FILE STORAGE

## 3.13 Simple Glossary
- Frontend: The part of the app users see.
- Backend: The server processing data.
- Database: Where data is saved.
- Cloud: Servers rented over the internet.
- Repository: Where code is stored.
- Docker: A tool to run software in isolated containers.

## 3.14 Management Summary
Aligne is a robust application for dental practice management. It relies on a PostgreSQL database and Firebase. Backups must be prioritized to ensure business continuity.
