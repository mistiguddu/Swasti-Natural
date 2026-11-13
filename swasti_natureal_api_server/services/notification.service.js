import { Notification } from '../models/Marketing.js';
import { paginate, parseListQuery, parseIdList } from '../utils/query.js';

/** Records an activity/notification. Never throws: a failed notification must not break the main action. */
export async function notify({ type, title, message = '', link = '', actor }) {
  try {
    await Notification.create({ type, title, message, link, actorName: actor?.name ?? '' });
  } catch (error) {
    console.warn('Could not record notification:', error.message);
  }
}

export async function listNotifications(query) {
  const listQuery = parseListQuery(query, { sortable: ['createdAt'], maxLimit: 100 });
  const filter = {};
  if (query.read === 'true') filter.read = true;
  if (query.read === 'false') filter.read = false;
  if (query.type) filter.type = new RegExp(`^${String(query.type).replace(/[^a-z_.]/gi, '')}`);
  const result = await paginate(Notification, filter, listQuery);
  return { ...result, unread: await Notification.countDocuments({ read: false }) };
}

export const unreadCount = () => Notification.countDocuments({ read: false });
export const markRead = (id) => Notification.findByIdAndUpdate(id, { read: true }, { new: true });
export const markAllRead = () => Notification.updateMany({ read: false }, { read: true });
export const deleteNotification = (id) => Notification.findByIdAndDelete(id);
export const deleteNotifications = (ids) => Notification.deleteMany({ _id: { $in: parseIdList(ids) } });
