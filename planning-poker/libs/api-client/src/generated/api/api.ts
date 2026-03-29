export * from './eventsService';
import { EventsService } from './eventsService';
import { IssuesService } from './issuesService';
import { RoomsService } from './roomsService';
import { UsersService } from './usersService';

export * from './issuesService';
export * from './roomsService';
export * from './usersService';
export const APIS = [EventsService, IssuesService, RoomsService, UsersService];
