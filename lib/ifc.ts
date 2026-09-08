/** Minimal IFC2X3-ish text export for walls/spaces (not full IFC certification). */

export function planToIfc(plan: {
  walls: any[];
  doors?: any[];
  windows?: any[];
  rooms?: any[];
}, projectName = "Sketch2CAD Project"): string {
  const lines: string[] = [];
  const emit = (s: string) => lines.push(s);
  let id = 1;
  const nid = () => id++;

  emit("ISO-10303-21;");
  emit("HEADER;");
  emit("FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');");
  emit(`FILE_NAME('${projectName.replace(/'/g, "")}.ifc','${new Date().toISOString()}',('Sketch2CAD'),('Sketch2CAD'),'Sketch2CAD IFC exporter','Sketch2CAD','');`);
  emit("FILE_SCHEMA(('IFC2X3'));");
  emit("ENDSEC;");
  emit("DATA;");

  const app = nid();
  emit(`#${app}=IFCAPPLICATION($,'Sketch2CAD','Sketch2CAD','0.5');`);
  const person = nid();
  emit(`#${person}=IFCPERSON($,$,'User',$,$,$,$,$);`);
  const org = nid();
  emit(`#${org}=IFCORGANIZATION($,'Sketch2CAD',$,$,$);`);
  const personOrg = nid();
  emit(`#${personOrg}=IFCPERSONANDORGANIZATION(#${person},#${org},$);`);
  const owner = nid();
  emit(`#${owner}=IFCOWNERHISTORY(#${personOrg},#${app},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)});`);

  const unit = nid();
  emit(`#${unit}=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);`);
  const units = nid();
  emit(`#${units}=IFCUNITASSIGNMENT((#${unit}));`);
  const world = nid();
  emit(`#${world}=IFCDIRECTION((1.,0.,0.));`);
  const up = nid();
  emit(`#${up}=IFCDIRECTION((0.,0.,1.));`);
  const origin = nid();
  emit(`#${origin}=IFCCARTESIANPOINT((0.,0.,0.));`);
  const axis = nid();
  emit(`#${axis}=IFCAXIS2PLACEMENT3D(#${origin},#${up},#${world});`);
  const ctx = nid();
  emit(`#${ctx}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${axis},$);`);

  const project = nid();
  emit(`#${project}=IFCPROJECT('${guid()}',#${owner},'${projectName}',$,$,$,$,(#${ctx}),#${units});`);

  const sitePlace = nid();
  emit(`#${sitePlace}=IFCLOCALPLACEMENT($,#${axis});`);
  const site = nid();
  emit(`#${site}=IFCSITE('${guid()}',#${owner},'Site',$,$,#${sitePlace},$,$,.ELEMENT.,$,$,$,$,$);`);

  const bldgPlace = nid();
  emit(`#${bldgPlace}=IFCLOCALPLACEMENT(#${sitePlace},#${axis});`);
  const bldg = nid();
  emit(`#${bldg}=IFCBUILDING('${guid()}',#${owner},'Building',$,$,#${bldgPlace},$,$,.ELEMENT.,$,$,$);`);

  const storeyPlace = nid();
  emit(`#${storeyPlace}=IFCLOCALPLACEMENT(#${bldgPlace},#${axis});`);
  const storey = nid();
  emit(`#${storey}=IFCBUILDINGSTOREY('${guid()}',#${owner},'Level 0',$,$,#${storeyPlace},$,$,.ELEMENT.,0.);`);

  const relAgg1 = nid();
  emit(`#${relAgg1}=IFCRELAGGREGATES('${guid()}',#${owner},$,$,#${project},(#${site}));`);
  const relAgg2 = nid();
  emit(`#${relAgg2}=IFCRELAGGREGATES('${guid()}',#${owner},$,$,#${site},(#${bldg}));`);
  const relAgg3 = nid();
  emit(`#${relAgg3}=IFCRELAGGREGATES('${guid()}',#${owner},$,$,#${bldg},(#${storey}));`);

  const productIds: number[] = [];

  for (const w of plan.walls || []) {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1;
    const thick = w.thickness_mm || 150;
    const height = w.height_mm || 2700;
    const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
    const mx = (w.x1 + w.x2) / 2;
    const my = (w.y1 + w.y2) / 2;

    const pnt = nid();
    emit(`#${pnt}=IFCCARTESIANPOINT((${mx.toFixed(3)},${my.toFixed(3)},0.));`);
    const dirX = nid();
    emit(`#${dirX}=IFCDIRECTION((${Math.cos(angle).toFixed(6)},${Math.sin(angle).toFixed(6)},0.));`);
    const place = nid();
    emit(`#${place}=IFCAXIS2PLACEMENT3D(#${pnt},#${up},#${dirX});`);
    const loc = nid();
    emit(`#${loc}=IFCLOCALPLACEMENT(#${storeyPlace},#${place});`);

    // approximate as extruded solid
    const p0 = nid();
    emit(`#${p0}=IFCCARTESIANPOINT((${(-len / 2).toFixed(3)},${(-thick / 2).toFixed(3)}));`);
    const p1 = nid();
    emit(`#${p1}=IFCCARTESIANPOINT((${(len / 2).toFixed(3)},${(-thick / 2).toFixed(3)}));`);
    const p2 = nid();
    emit(`#${p2}=IFCCARTESIANPOINT((${(len / 2).toFixed(3)},${(thick / 2).toFixed(3)}));`);
    const p3 = nid();
    emit(`#${p3}=IFCCARTESIANPOINT((${(-len / 2).toFixed(3)},${(thick / 2).toFixed(3)}));`);
    const poly = nid();
    emit(`#${poly}=IFCPOLYLINE((#${p0},#${p1},#${p2},#${p3},#${p0}));`);
    const profile = nid();
    emit(`#${profile}=IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${poly});`);
    const zdir = nid();
    emit(`#${zdir}=IFCDIRECTION((0.,0.,1.));`);
    const solid = nid();
    emit(`#${solid}=IFCEXTRUDEDAREASOLID(#${profile},$,#${zdir},${height.toFixed(3)});`);
    const shapeRep = nid();
    emit(`#${shapeRep}=IFCSHAPEREPRESENTATION(#${ctx},'Body','SweptSolid',(#${solid}));`);
    const prodDef = nid();
    emit(`#${prodDef}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRep}));`);
    const wall = nid();
    emit(`#${wall}=IFCWALLSTANDARDCASE('${guid()}',#${owner},'${(w.label || "Wall").replace(/'/g, "")}',$,$,#${loc},#${prodDef},$);`);
    productIds.push(wall);
  }

  for (const r of plan.rooms || []) {
    const space = nid();
    emit(`#${space}=IFCSPACE('${guid()}',#${owner},'${(r.name || "Room").replace(/'/g, "")}',$,$,#${storeyPlace},$,$,.ELEMENT.,.INTERNAL.,$);`);
    productIds.push(space);
  }

  if (productIds.length) {
    const rel = nid();
    emit(`#${rel}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',#${owner},$,$,(${productIds.map((i) => `#${i}`).join(",")}),#${storey});`);
  }

  emit("ENDSEC;");
  emit("END-ISO-10303-21;");
  return lines.join("\n");
}

function guid() {
  // IFC compressed GUID-ish
  const s = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
  let out = "";
  for (let i = 0; i < 22; i++) out += s[Math.floor(Math.random() * s.length)];
  return out;
}
