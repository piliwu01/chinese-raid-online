import React,{useState} from 'react';
// 道具圖示：優先用繪製的 HD-2D 道具圖，讀不到時退回 emoji。
export default function ItemIcon({item,className=''}){
 const [failed,setFailed]=useState(false);
 if(!item)return null;
 return failed?<span className={className}>{item.icon}</span>:<img className={`item-art ${className}`} src={`/assets/item-${item.id}.png`} alt="" loading="lazy" onError={()=>setFailed(true)}/>;
}
