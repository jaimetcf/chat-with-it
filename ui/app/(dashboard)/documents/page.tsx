import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DocumentManagement } from '@/components/document-management';

export default function DocumentsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DocumentManagement />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
