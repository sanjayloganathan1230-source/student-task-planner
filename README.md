# StudyFlow — Student Task Planner

A responsive student task planner built with HTML, CSS, and JavaScript to help students organize assignments, manage deadlines, and track study progress.

## Features

- Dashboard with task and progress summaries
- Create, edit, and delete tasks
- Mark tasks as complete
- Search tasks and filter by status or priority
- Set task priorities and deadlines
- Calendar view for planning due dates
- Responsive layout for desktop and mobile
- Saves tasks in the browser using `localStorage`

## Screenshots

Add your screenshots to a folder named `screenshots/` in the repository, then use:

### Dashboard
![Dashboard](screenshots/01-dashboard.png)

### My Tasks
![My Tasks](screenshots/02-tasks.png)

### Calendar
![Calendar](screenshots/03-calendar.png)

### Mobile View
![Mobile Dashboard](screenshots/04-mobile-dashboard.png)

> If you have not uploaded the screenshots yet, you can remove this section temporarily.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Browser LocalStorage

## Getting Started

This is a static front-end project, so no backend or package installation is required.

1. Download or clone this repository.
2. Open the project folder.
3. Open `index.html` in your browser.

For a more reliable local development server, open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Project Structure

```text
student-task-planner/
├── index.html
├── style.css
├── script.js
├── README.md
└── screenshots/
    ├── 01-dashboard.png
    ├── 02-tasks.png
    ├── 03-calendar.png
    └── 04-mobile-dashboard.png
```

## Data Storage

Tasks are stored in your browser's `localStorage`. They remain available after refreshing the page in the same browser, but they are not automatically synced between different browsers or devices. Clearing browser site data may remove saved tasks.

## Live Demo

Add your GitHub Pages URL here after enabling GitHub Pages:

`https://YOUR-USERNAME.github.io/student-task-planner/`

## Future Improvements

- Add task reminders
- Add export and import options
- Add user accounts and cloud sync

## License

This project is available for learning and personal portfolio use. Add a license file if you want to specify formal reuse and distribution terms.
