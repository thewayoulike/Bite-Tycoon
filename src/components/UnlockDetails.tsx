export type UnlockInfo={visible:string;milestone:string;cost:string;recurring:string;needs:string;next:string};
export function UnlockDetails(info:UnlockInfo){
  return <dl className="unlock-details">{([['Visible change',info.visible],['Service milestone',info.milestone],['Build / unlock cost',info.cost],['Running costs',info.recurring],['Stock & staff',info.needs],['Next step',info.next]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
