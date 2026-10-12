// v0.7.5 compatibility adapter: every location and path is now derived
// from ONE official restaurant-scene layout.
import {DINER_FLOOR,dinerSpot,dinerWalk,dinerWaiterRoute} from './restaurant_scene_v075.js?v=0.7.5';
export const HERO_STATIONS={WOK:DINER_FLOOR.left,POT:DINER_FLOOR.right};
export const HERO_PASS=DINER_FLOOR.pass;
export const HERO_TABLES=DINER_FLOOR.tableWork;
export function newServiceHero(){
 return {x:.5,y:.365,direction:'down',moving:false,energy:6,maxEnergy:6,recovery:0,
  carryOrderId:null,assistIds:[],comfortIds:[],assists:0,comforts:0,delivered:0,
  dwellZone:null,dwell:0};
}
export function heroZone(h,s=null){return dinerSpot(h,s)}
export function walkServiceHero(h,dx,dy,dt,s=null){return dinerWalk(h,dx,dy,dt,s)}
export function waiterDeliveryPose(s,t){return dinerWaiterRoute(s,t)}
