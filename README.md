# Budget Tracker Pro

A comprehensive personal and group budget management application built with React, TypeScript, and Supabase. Track expenses, manage categories, set budget limits, and collaborate with groups seamlessly.

## 🚀 Features

### Personal Budget Management
- ✅ Track income and expenses with custom categories
- ✅ Set daily, weekly, and monthly budget limits
- ✅ Advanced budget analytics with visual charts
- ✅ Category-based expense organization
- ✅ Real-time balance calculations

### Group Budget Management
- ✅ Create and manage budget groups
- ✅ Invite members via email
- ✅ Group expense tracking and analytics
- ✅ Member contribution insights
- ✅ Collaborative budget setting

### User Management
- ✅ Secure authentication with Supabase Auth
- ✅ User profiles with customizable information
- ✅ Account management and settings

## 🏗️ System Architecture

<lov-mermaid>
erDiagram
    PROFILES {
        uuid id PK
        uuid user_id FK
        text username
        text full_name
        text avatar_url
        numeric total_expenditure_limit
        timestamp created_at
        timestamp updated_at
    }
    
    CATEGORIES {
        uuid id PK
        uuid user_id FK
        text name
        text color
        text icon
        text type
        timestamp created_at
        timestamp updated_at
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        uuid group_id FK
        text description
        numeric amount
        text type
        date date
        timestamp created_at
        timestamp updated_at
    }
    
    BUDGETS {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        numeric amount
        text period
        date start_date
        date end_date
        timestamp created_at
        timestamp updated_at
    }
    
    GROUPS {
        uuid id PK
        uuid created_by FK
        text name
        text description
        numeric total_expenditure_limit
        timestamp created_at
        timestamp updated_at
    }
    
    GROUP_MEMBERS {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        text role
        timestamp joined_at
    }
    
    GROUP_INVITATIONS {
        uuid id PK
        uuid group_id FK
        uuid invited_by FK
        uuid invited_user_id FK
        text invited_email
        text status
        timestamp created_at
        timestamp updated_at
    }
    
    GROUP_BUDGETS {
        uuid id PK
        uuid group_id FK
        uuid category_id FK
        uuid created_by FK
        numeric amount
        text period
        date start_date
        date end_date
        timestamp created_at
        timestamp updated_at
    }
    
    PROFILES ||--o{ TRANSACTIONS : "creates"
    PROFILES ||--o{ CATEGORIES : "owns"
    PROFILES ||--o{ BUDGETS : "sets"
    PROFILES ||--o{ GROUPS : "creates"
    CATEGORIES ||--o{ TRANSACTIONS : "categorizes"
    CATEGORIES ||--o{ BUDGETS : "limits"
    GROUPS ||--o{ GROUP_MEMBERS : "contains"
    GROUPS ||--o{ GROUP_INVITATIONS : "has"
    GROUPS ||--o{ GROUP_BUDGETS : "manages"
    GROUPS ||--o{ TRANSACTIONS : "tracks"
    PROFILES ||--o{ GROUP_MEMBERS : "joins"
    PROFILES ||--o{ GROUP_INVITATIONS : "receives"
</lov-mermaid>

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - High-quality component library
- **React Router** - Client-side routing
- **Recharts** - Data visualization and analytics
- **React Hook Form** - Form state management
- **Zod** - Schema validation

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Data security
- **Supabase Auth** - Authentication system
- **Real-time subscriptions** - Live data updates

### Development & Build
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase account and project

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/budget-tracker-pro.git
   cd budget-tracker-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id
   ```

4. **Set up the database**
   
   Run the SQL migrations in your Supabase SQL editor:
   ```sql
   -- Enable necessary extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   
   -- Run all migration files in order
   -- (See supabase/migrations/ directory)
   ```

5. **Configure Authentication**
   
   In your Supabase dashboard:
   - Go to Authentication → Settings
   - Configure your Site URL and redirect URLs
   - Enable email confirmation (optional)

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

The application will be available at `http://localhost:5173`

## 📱 Usage

### Personal Budget Tracking
1. **Sign up** or **Sign in** to your account
2. **Create categories** for your expenses and income
3. **Add transactions** with amounts, descriptions, and categories
4. **Set budget limits** for categories or total expenditure
5. **View analytics** in the Budget & Analytics tab

### Group Budget Management
1. **Create a group** from the Groups page
2. **Invite members** by email address
3. **Add group transactions** that all members can see
4. **Set group budgets** and limits collaboratively
5. **View group analytics** and member contributions

## 🔧 Configuration

### Database Functions
The app uses several PostgreSQL functions for security and business logic:
- `is_group_member(group_uuid, user_uuid)` - Check group membership
- `is_group_admin(group_uuid, user_uuid)` - Check admin privileges
- `current_user_email()` - Get current user's email
- `set_group_total_expenditure_limit()` - Manage group limits

### Row Level Security
All database tables implement RLS policies to ensure:
- Users can only access their own data
- Group members can only access group data they belong to
- Proper authorization for all CRUD operations

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy

### Other Platforms
The app can be deployed to any static hosting platform:
- Vercel
- AWS S3 + CloudFront
- GitHub Pages
- Firebase Hosting

## 📈 Features Roadmap

- [ ] Mobile app with React Native
- [ ] Receipt scanning with OCR
- [ ] Bank account integration
- [ ] Advanced reporting and exports
- [ ] Multi-currency support
- [ ] Recurring transactions
- [ ] Budget templates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [Your deployed app URL]
- **Documentation**: [Link to detailed docs]
- **Bug Reports**: [GitHub Issues]
- **Feature Requests**: [GitHub Discussions]

## 🙏 Acknowledgments

- Supabase team for the excellent BaaS platform
- Shadcn for the beautiful UI components
- React and TypeScript communities