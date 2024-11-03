import { Injectable } from '@nestjs/common';

@Injectable()
export class UserConnectionService {
    private activeUsers = new Map<string, string>();

    setUserConnection(userId: string, socketId: string) {
        this.activeUsers.set(userId, socketId);
    }

    getUserSocketId(userId: string): string | undefined {
        return this.activeUsers.get(userId);
    }

    removeUserConnection(socketId: string) {
        const userId = [...this.activeUsers.entries()].find(([_, id]) => id === socketId)?.[0];
        if (userId) {
            this.activeUsers.delete(userId);
        }
    }
}
