export function Icon({ d, size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <g dangerouslySetInnerHTML={{ __html: d }} />
    </svg>
  );
}

const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.4.3 4.3 2 5 5.4"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  store: '<path d="M4 7l1.5-4h13L20 7"/><path d="M4 7h16v3a2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0V7z"/><path d="M5.5 12.5V21h13v-8.5"/><path d="M9.5 21v-6h5v6"/>',
  dot: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
};

export const DashboardIcon = (p) => <Icon d={paths.dashboard} {...p} />;
export const ProductsIcon = (p) => <Icon d={paths.box} {...p} />;
export const OrdersIcon = (p) => <Icon d={paths.receipt} {...p} />;
export const UsersIcon = (p) => <Icon d={paths.users} {...p} />;
export const PaymentsIcon = (p) => <Icon d={paths.card} {...p} />;
export const AnalyticsIcon = (p) => <Icon d={paths.chart} {...p} />;
export const StoreIcon = (p) => <Icon d={paths.store} {...p} />;
export const DotIcon = (p) => <Icon d={paths.dot} {...p} />;
