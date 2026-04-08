# Task Manager - TypeScript Migration

A fully-typed Task Manager application migrated from JavaScript to TypeScript with enhanced features including recurring tasks, task dependencies, statistics, and improved search/sort capabilities.

## Features

### Core Features (from original)
- ✅ Create, Read, Update, Delete (CRUD) tasks
- ✅ Filter by status, priority, and tags
- ✅ Search in title and description (case-insensitive)
- ✅ LocalStorage persistence
- ✅ Input validation with error messages

### New TypeScript Features
- ✅ **Strict TypeScript** - Full type safety with strict mode enabled
- ✅ **Recurring Tasks** - Tasks can repeat daily, weekly, monthly, or custom intervals
- ✅ **Task Dependencies** - Tasks can depend on other tasks; completion blocked until dependencies are done
- ✅ **Statistics Dashboard** - View task counts by status/priority, completion rate, overdue count
- ✅ **Enhanced Sorting** - Sort by due date, priority, status, or title
- ✅ **Generic Utilities** - Reusable typed functions for filtering, sorting, and merging

## Type Definitions

### Task Entity
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;        // 'todo' | 'in-progress' | 'done'
  priority: Priority;    // 'low' | 'medium' | 'high'
  dueDate: string;       // ISO 8601
  tags: readonly string[];
  recurrence?: Recurrence;
  dependencies: TaskDependencies;
  createdAt: string;
  updatedAt: string;
}
```

### Recurrence Types
```typescript
// Standard recurrence
type StandardRecurrence = {
  frequency: 'daily' | 'weekly' | 'monthly';
  endDate?: string;
};

// Custom recurrence
type CustomRecurrence = {
  frequency: 'custom';
  daysInterval: number;
  endDate?: string;
};

type Recurrence = StandardRecurrence | CustomRecurrence;
```

## Usage Examples

### Creating a Task with Recurrence
```typescript
const task = await taskService.create({
  title: "Weekly team meeting",
  description: "Review project progress",
  status: "todo",
  priority: "medium",
  dueDate: "2026-02-24T00:00:00.000Z",
  tags: ["work", "meeting"],
  recurrence: {
    frequency: "weekly",
    endDate: "2026-12-31T00:00:00.000Z" // Optional end date
  }
});
```

### Creating a Task with Dependencies
```typescript
// First, create the dependency task
const prerequisite = await taskService.create({
  title: "Research phase",
  status: "todo",
  priority: "high",
  dueDate: "2026-02-20T00:00:00.000Z"
});

// Then create dependent task
const dependent = await taskService.create({
  title: "Development phase",
  status: "todo",
  priority: "high",
  dueDate: "2026-02-25T00:00:00.000Z",
  dependencies: [prerequisite.id] // Blocked until prerequisite is done
});

// Attempting to mark dependent as done will fail:
await taskService.update({ id: dependent.id, status: "done" });
// throws: "Cannot complete task: dependencies not satisfied"
```

### Querying with Filters and Sorting
```typescript
// Get high-priority tasks sorted by due date
const tasks = await taskService.query(
  { priority: "high" },
  { field: "dueDate", direction: "asc" }
);
```

### Getting Statistics
```typescript
const stats = await taskService.getStatistics();
console.log(stats);
// {
//   total: 10,
//   byStatus: { todo: 3, 'in-progress': 2, done: 5 },
//   byPriority: { low: 2, medium: 5, high: 3 },
//   overdue: 1,
//   completionRate: 50,
//   completedCount: 5,
//   pendingCount: 3,
//   inProgressCount: 2
// }
```

### Getting Upcoming Recurring Tasks
```typescript
const recurring = await taskService.getUpcomingRecurring(5);
console.log(recurring);
// [
//   { task: {...}, nextOccurrence: "...", daysUntilNext: 2 },
//   ...
// ]
```

## Project Structure

```
├── src/
│   ├── models/
│   │   ├── task.ts      # Task interface
│   │   └── types.ts     # Type definitions & interfaces
│   ├── services/
│   │   ├── storage.ts       # Storage layer with error handling
│   │   ├── taskService.ts   # Business logic & CRUD
│   │   └── statistics.ts    # Statistics computation
│   ├── utils/
│   │   └── genericUtils.ts  # Generic utility functions
│   ├── ui/
│   │   ├── dom.ts       # DOM rendering functions
│   │   └── events.ts    # Event handling
│   └── index.ts         # Application entry point
├── index.html           # Main HTML with form inputs
├── style.css            # Styling (including new features)
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Building the Project

The project uses ES modules and is configured with esbuild for bundling.

### Development
```bash
npm run dev
```
This starts the development server with hot reload.

### Production Build
```bash
npm run build
```
This compiles and bundles the TypeScript to `dist/main.js`.

### Type Checking
```bash
npx tsc --noEmit
```

## GitLab CI/CD Pipeline

This project uses a full GitLab pipeline defined in `.gitlab-ci.yml`.

### CI stages

1. `validate`
  - Validates Docker Compose syntax (`docker compose -f docker-compose.vps.yml config -q`)
2. `quality`
  - Type checking (`npm run typecheck`)
  - Automated tests (`npm run test:ci`)
3. `build`
  - Frontend bundle build (`npm run build`)
4. `docker`
  - Builds both container images:
    - `Dockerfile.ts`
    - `Dockerfile.js`

### CD stage

- `deploy:vps` runs only on `main` branch.
- Pipeline connects to VPS over SSH and runs:

```bash
cd <DEPLOY_PATH>
git fetch --all --prune
git checkout main
git pull --ff-only origin main
cd velinn-js
docker compose -f docker-compose.vps.yml up -d --build --remove-orphans
```

### Required GitLab CI Variables

Set these in **GitLab -> Settings -> CI/CD -> Variables**:

- `DEPLOY_HOST` - VPS host/IP
- `DEPLOY_USER` - SSH username on VPS
- `DEPLOY_PATH` - Absolute path on VPS where repository is cloned
- `DEPLOY_SSH_PRIVATE_KEY` - Private key content for deployment user
- `DEPLOY_SSH_KNOWN_HOSTS` - Output of `ssh-keyscan <DEPLOY_HOST>`

Optional:

- `DEPLOY_BRANCH` - Defaults to `main`
- `DEPLOY_STRICT_HOST_KEY_CHECKING` - Defaults to `yes`

## Deploy Both Projects To VPS (Docker)

This repository now includes two Docker images:

- **TypeScript app container** via `Dockerfile.ts` (serves the TS build)
- **Legacy JavaScript app container** via `Dockerfile.js` (serves `index-js.html` + `js/` files)

### Public URLs (after deploy)

- TypeScript app: `http://vera-linno-task-management.proxy.itcollege.ee/ts/`
- JavaScript app: `http://vera-linno-task-management.proxy.itcollege.ee/js/`

Infrastructure mapping:

- `vera-linno-task-management.proxy.itcollege.ee` -> `192.168.181.101:83`
- Nginx gateway in `docker-compose.vps.yml` routes:
  - `/ts/` -> `task-manager-ts` container
  - `/js/` -> `task-manager-js` container

### Full Path To Public URL

1. Local code in this repo (`velinn-js/`)
2. Push to GitLab (`git@gitlab.com:<GROUP>/<REPO>.git`)
3. VPS pulls the repo over SSH key auth
4. `docker compose -f docker-compose.vps.yml up -d --build` starts the TS container, JS container, and nginx gateway
5. Gateway listens on VPS `:83` and routes `/ts/` and `/js/` to the correct container
6. External proxy domain (`vera-linno-task-management.proxy.itcollege.ee`) points to `192.168.181.101:83`
7. Public users open the two URLs listed above

### 1) Prepare VPS (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out/in once after `usermod` so `docker` works without `sudo`.

### 2) Add SSH Key To GitLab

On VPS:

```bash
ssh-keygen -t ed25519 -C "vps-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

In GitLab:

1. Go to **User Settings -> SSH Keys**
2. Paste the VPS public key
3. Save

Test access from VPS:

```bash
ssh -T git@gitlab.com
```

### 3) Deploy Containers On VPS

```bash
git clone git@gitlab.com:<GROUP>/<REPO>.git
cd <REPO>/velinn-js
docker compose -f docker-compose.vps.yml up -d --build
docker compose -f docker-compose.vps.yml ps
```

### 4) Firewall (if needed)

```bash
sudo ufw allow 83/tcp
```

### 5) Update Deployments

```bash
git pull
docker compose -f docker-compose.vps.yml up -d --build
```

## Generic Utility Functions

The `src/utils/genericUtils.ts` provides these reusable typed functions:

- `genericFilter<T>(array, predicate)` - Filter array by predicate
- `genericSort<T, K>(array, keyFn, ascending)` - Sort array by key function
- `genericMerge<T, U>(target, source)` - Merge two objects
- `genericGroupBy<T, K>(array, keyFn)` - Group array by key

## Error Handling

All storage operations are wrapped in try-catch with typed `AppError`:

```typescript
try {
  await taskService.update({ id: "123", status: "done" });
} catch (error) {
  if (error instanceof AppError) {
    console.log(error.code);    // ErrorCode
    console.log(error.message); // User-friendly message
    console.log(error.details); // Original error
  }
}
```

## Browser Support

- Chrome/Edge 89+ (ES Modules)
- Firefox 89+
- Safari 15+

## License

MIT
