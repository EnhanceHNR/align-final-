# **App Name**: LabTrack Mobile

## Core Features:

- Send Submission: Collect sender name, photo (with timestamp), sending item (with timestamp), delivery person (optional, with timestamp), receiving lab/person, patient name, and appointment status (with dropdown: Appointment given/not given).  Store into Firestore, and trigger an email notification to the admin containing all the collected details.
- Receive Submission: Collect receiver name, photo (with timestamp), received item (with timestamp), delivery person (optional, with timestamp), receiving lab/person, patient name, and appointment status (with dropdown: Appointment given/not given). If appointment is given, capture the date input. Store into Firestore, and trigger an email notification to the admin containing all the collected details.
- Autocomplete Fields: Implement autocomplete for patient and lab names based on previous entries. When the user starts typing, a dropdown will show existing names. The user can select an existing entry or add a new one.
- Reporting: Generate PDF and CSV reports of all records, including photos.  These reports are generated from Firestore.
- Email Notifier: A background function tool to use provided details and construct an email to the administrators, detailing what has changed or been created.
- Dashboard: Dashboard UI, offering send/receive options
- Storage: Connect the production ready application with Firebase storage for storing images and details

## Style Guidelines:

- Primary color: Light grayish-blue (#A6B1E1) to represent the scientific and lab environment of the app, and connote a sense of calm and trustworthiness. A muted color is ideal as a non-distracting base.
- Background color: Very light gray (#F0F2F5), almost white, to maximize readability and give a clean, clinical appearance. This lightness goes along with the light color scheme that's right for an office environment.
- Accent color: A more saturated purple (#78586F) to provide visual interest and contrast, drawing attention to key elements without clashing with the primary color.
- Body and headline font: 'Inter' (sans-serif) for a modern, clean, and highly readable interface, especially suited for data-rich applications.
- Use minimalist and clear icons for actions and data types. Icons should be visually consistent and support the overall clean aesthetic.
- Design a mobile-first responsive layout that adapts to various screen sizes. Utilize clear, intuitive forms for data input, with prominent CTAs for send and receive actions.
- Incorporate subtle animations for transitions and feedback, such as loading indicators and form submission confirmations. Animations should be smooth and non-intrusive to maintain a professional user experience.