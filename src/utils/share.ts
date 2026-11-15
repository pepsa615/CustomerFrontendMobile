import { Share } from 'react-native';
export function shareDeliveryLink(url: string) { return Share.share({ message: url, url }); }
