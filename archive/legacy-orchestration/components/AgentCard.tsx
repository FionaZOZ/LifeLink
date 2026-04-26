import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface AgentCardProps {
  name: string;
  icon: LucideIcon;
  status: 'idle' | 'active' | 'done';
  lastEvent?: {
    message: string;
    timestamp: string;
  };
}

export function AgentCard({ name, icon: Icon, status, lastEvent }: AgentCardProps) {
  const statusColors = {
    idle: 'bg-gray-200 text-gray-700',
    active: 'bg-yellow-200 text-yellow-800 animate-pulse',
    done: 'bg-green-200 text-green-800',
  };

  const statusDotColors = {
    idle: 'bg-gray-400',
    active: 'bg-yellow-500 animate-pulse',
    done: 'bg-green-500',
  };

  return (
    <Card className={`h-full transition-all ${status === 'active' ? 'ring-2 ring-yellow-400' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon className="h-5 w-5" />
              <div className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${statusDotColors[status]}`} />
            </div>
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <Badge className={statusColors[status]} variant="secondary">
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {lastEvent ? (
          <div className="space-y-1">
            <p className="text-sm text-gray-700">{lastEvent.message}</p>
            <p className="text-xs text-gray-500">{lastEvent.timestamp}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Waiting for emergency...</p>
        )}
      </CardContent>
    </Card>
  );
}
