import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ClientStatisticsService } from '../ORM/client-statistics/client-statistics.service';
import { ClientService } from '../ORM/client/client.service';
import { RpcBlockService } from '../ORM/rpc-block/rpc-block.service';

@Injectable()
export class AppService implements OnModuleInit {

    constructor(
        private readonly clientStatisticsService: ClientStatisticsService,
        private readonly clientService: ClientService,
        private readonly dataSource: DataSource,
        private readonly rpcBlockService: RpcBlockService,
    ) {

    }

    async onModuleInit() {
        // Enable foreign key constraints
        await this.dataSource.query(`PRAGMA foreign_keys = ON;`);

        // Set busy timeout (in milliseconds)
        await this.dataSource.query(`PRAGMA busy_timeout = 15000;`); // 15 seconds, Default is 0

        // Enable WAL mode
        await this.dataSource.query(`PRAGMA journal_mode = WAL;`); // Default is DELETE

        // Set synchronous mode to NORMAL for better performance while maintaining data integrity
        await this.dataSource.query(`PRAGMA synchronous = NORMAL;`); // Default is FULL

        // Increase cache size (adjust the value based on your server's available memory)
        await this.dataSource.query(`PRAGMA cache_size = -64000;`); // 64MB cache, Default is 2000

        // Enable memory-mapped I/O with a conservative setting
        await this.dataSource.query(`PRAGMA mmap_size = 268435456;`); // 256MB, Default is 0

        // Set a reasonable WAL autocheckpoint
        await this.dataSource.query(`PRAGMA wal_autocheckpoint = 1000;`); // Default is 1000

        if (process.env.ENABLE_SOLO == 'true' && (process.env.NODE_APP_INSTANCE == null || process.env.NODE_APP_INSTANCE == '0')) {

            setInterval(async () => {
                await this.deleteOldStatistics();
            }, 1000 * 60 * 60);

            setInterval(async () => {
                console.log('Killing dead clients');
                await this.clientService.killDeadClients();
            }, 1000 * 60 * 5); // 5 minutes

            setInterval(async () => {
                console.log('Deleting Old Blocks');
                await this.rpcBlockService.deleteOldBlocks();
            }, 1000 * 60 * 60 * 24); // 1 day
        }
    }

    private async deleteOldStatistics() {
        console.log('Deleting statistics');

        const deletedStatistics = await this.clientStatisticsService.deleteOldStatistics();
        console.log(`Deleted ${deletedStatistics.affected} old statistics`);
        const deletedClients = await this.clientService.deleteOldClients();
        console.log(`Deleted ${deletedClients.affected} old clients`);

    }


}