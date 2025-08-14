import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ChatInterface } from '@/components/chat-interface';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ChatInterface />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
