// Directors' Food Orders view — the exact same screen the Ops console uses,
// rendered inside the SuperAdmin shell. The component itself gates the extra
// superAdmin-only capability (hard delete) on isSuperAdmin from useAuth.
export { default } from '../eatsadmin/OrdersPage';
