// import { DataSource, DataSourceOptions } from 'typeorm';

// export const dataSourceOptions: DataSourceOptions = {
//   type: 'postgres',
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT, 10) || 5432,
//   username: process.env.DB_USERNAME || 'nestjs_user',
//   password: process.env.DB_PASSWORD || 'nestjs_password',
//   database: process.env.DB_DATABASE || 'nestjs_db',
//   entities: ['dist/**/*.entity.js'],
//   migrations: ['dist/db/migrations/*.js'],
//   synchronize: false,
// };

// const dataSource = new DataSource(dataSourceOptions);
// export default dataSource;
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/db/migrations/*.js'],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
