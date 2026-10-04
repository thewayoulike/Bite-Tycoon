import {CashForecast} from './CashForecast';
export type UnlockInfo={visible:string;milestone:string;cost:string;recurring:string;needs:string;next:string;buildCost?:number;stockCost?:number;addedWages?:number;upkeep?:number};
export function UnlockDetails(info:UnlockInfo){
  const quoted=info.cost.match(/\$([\d,]+(?:\.\d+)?)/);
  return <><dl className="unlock-details">{([['Visible change',info.visible],['Service milestone',info.milestone],['Build / unlock cost',info.cost],['Running costs',info.recurring],['Stock & staff',info.needs],['Next step',info.next]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><CashForecast build={info.buildCost??(quoted?Number(quoted[1].replaceAll(',','')):0)} stock={info.stockCost} addedWages={info.addedWages} upkeep={info.upkeep}/></>;
}
