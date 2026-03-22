export * from './eventsService';
import { EventsService } from './eventsService';
export * from './roomsService';
import { RoomsService } from './roomsService';
export * from './usersService';
import { UsersService } from './usersService';
export const APIS = [EventsService, RoomsService, UsersService];
