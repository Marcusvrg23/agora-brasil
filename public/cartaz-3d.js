import * as THREE from 'three';
import {CARTAZ_MEDIDAS as m} from './cartaz-config.mjs';
// Same texture, material and geometry on two front faces: text reads correctly from either side.
export function criarCartaz3D(texture){
 const group=new THREE.Group();group.name='cartaz-em-mao';
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,m.haste,8),new THREE.MeshLambertMaterial({color:'#755c3c'}));
 pole.position.y=m.centroHaste;group.add(pole);
 const board=new THREE.Mesh(new THREE.PlaneGeometry(m.largura,m.altura),new THREE.MeshBasicMaterial({map:texture,side:THREE.FrontSide}));
 board.position.y=m.centroPlaca;
 const back=new THREE.Mesh(board.geometry,board.material);back.rotation.y=Math.PI;back.position.z=-.003;back.name='verso-legivel';board.add(back);group.add(board);
 return {group,pole,board};
}
