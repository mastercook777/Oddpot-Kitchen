// Field sprites and all ingredient UI use one raster definition and cache.
import {ING} from './data.js?v=0.11.0-alpha.7';
import {ingredientSpriteCanvas} from './field_pixel_herb_v011c.js?v=0.11.0-alpha.7';
const ingredientIconUrls=new Map();
export function ingredientIconUrl(id){
 if(!Object.hasOwn(ING,id))return null;
 let url=ingredientIconUrls.get(id);if(url)return url;
 const sprite=ingredientSpriteCanvas(id);if(!sprite)return null;
 url=sprite.toDataURL('image/png');ingredientIconUrls.set(id,url);return url;
}
export function ingredientIconHtml(id,size=24){
 const url=ingredientIconUrl(id);if(!url)return '';
 const pixels=Math.max(12,Math.min(64,Number(size)||24));
 return `<img class="ingredient-icon" data-ingredient-icon="${id}" src="${url}" width="${pixels}" height="${pixels}" style="--ingredient-size:${pixels}px" alt="" aria-hidden="true" draggable="false">`;
}
