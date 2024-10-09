import { Request } from 'express';

export interface CustomRequest extends Request {
    cookies: { [key: string]: string }; 
}