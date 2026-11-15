import { apiRequest } from '@/api/client';
export type AccountProfile={id:string;fullName:string;email:string;phone:string;dob:string;gender:'MALE'|'FEMALE'|'OTHER';emailVerified:boolean;phoneVerified:boolean;accountNumber:string|null;hasNin:boolean;maskedNin:string|null};
export const settingsApi={
 profile:(t:string)=>apiRequest<AccountProfile>('/account/profile',t),
 update:(t:string,fullName:string)=>apiRequest<AccountProfile>('/account/profile',t,{method:'PATCH',body:JSON.stringify({fullName})}),
 password:(t:string,currentPassword:string,newPassword:string)=>apiRequest('/account/password/change',t,{method:'POST',body:JSON.stringify({currentPassword,newPassword})}),
 pin:(t:string,currentPin:string,newPin:string)=>apiRequest('/account/transaction-pin/change',t,{method:'POST',body:JSON.stringify({currentPin,newPin,confirmPin:newPin})}),
 requestPin:(t:string)=>apiRequest('/account/transaction-pin/reset/request',t,{method:'POST',body:'{}'}),
 resetPin:(t:string,code:string,newPin:string)=>apiRequest('/account/transaction-pin/reset/confirm',t,{method:'POST',body:JSON.stringify({code,newPin,confirmPin:newPin})}),
 requestDeactivation:(t:string)=>apiRequest('/account/deactivation/request',t,{method:'POST',body:'{}'}),
 deactivate:(t:string,code:string)=>apiRequest('/account/deactivation/confirm',t,{method:'POST',body:JSON.stringify({code})}),
};
