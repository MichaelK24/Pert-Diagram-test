
//chartgen js
//michael king
//generates pert chart layouts with preset data sets

(function(global)
{
	function randInt(min,max)
	{
		return Math.floor(Math.random()*(max-min+1))+min;
	}

    //constant layouts for the possible chart types
	const layouts=
	[
		{name:'classic',preds:{A:[],B:['A'],C:['A'],D:['B','C'],E:['D'],F:['D'],G:['E','F']},positions:{A:['5%','160px'],B:['22%','50px'],C:['22%','270px'],D:['40%','160px'],E:['58%','50px'],F:['58%','270px'],G:['76%','160px']}},
		{name:'splitmerge',preds:{A:[],B:['A'],C:['A'],D:['B'],E:['D'],F:['C'],G:['E','F']},positions:{A:['3%','160px'],B:['20%','80px'],C:['20%','240px'],D:['38%','80px'],E:['56%','80px'],F:['38%','240px'],G:['74%','160px']}},
		{name:'diamond',preds:{A:[],B:['A'],C:['A'],D:['C'],E:['B'],F:['D','E'],G:['F']},positions:{A:['5%','160px'],B:['22%','100px'],C:['22%','220px'],D:['40%','220px'],E:['40%','100px'],F:['58%','160px'],G:['76%','160px']}},
		{name:'parallel',preds:{A:[],B:['A'],C:['B'],D:['A'],E:['D'],F:['E'],G:['C','F']},positions:{A:['3%','160px'],B:['20%','80px'],C:['36%','80px'],D:['20%','240px'],E:['36%','240px'],F:['52%','240px'],G:['72%','160px']}},
		{name:'ladder',preds:{A:[],B:['A'],C:['A'],D:['B'],E:['C'],F:['D','E'],G:['F']},positions:{A:['2%','160px'],B:['16%','120px'],C:['16%','200px'],D:['30%','120px'],E:['30%','200px'],F:['50%','160px'],G:['72%','160px']}},
		{name:'zigzag',preds:{A:[],B:['A'],C:['B'],D:['A'],E:['D','C'],F:['E'],G:['F']},positions:{A:['3%','160px'],B:['18%','120px'],C:['34%','120px'],D:['18%','200px'],E:['40%','160px'],F:['58%','160px'],G:['76%','160px']}},
		{name:'converge',preds:{A:[],B:['A'],C:['A'],D:['B'],E:['C'],F:['D','E'],G:['F']},positions:{A:['2%','160px'],B:['18%','100px'],C:['18%','220px'],D:['34%','100px'],E:['34%','220px'],F:['56%','160px'],G:['76%','160px']}},
		{name:'complex',preds:{A:[],B:['A'],C:['B'],D:['B'],E:['C','D'],F:['E'],G:['F']},positions:{A:['2%','160px'],B:['16%','160px'],C:['30%','100px'],D:['30%','220px'],E:['46%','160px'],F:['62%','160px'],G:['78%','160px']}}
	];

	//preset length sets 10 sets of 7 numbers a to g
	//these come from the csv file and will be used when generatelayout layoutindex setindex is called or when url contains set 1 to 10
	//each inner array maps to a b c d e f g
	const presetSets=
	[
		[4,8,2,1,5,6,10],   //set 1
		[1,11,4,2,10,12,7], //set 2
		[3,5,12,9,2,11,4],  //set 3
		[4,6,10,8,1,12,2],  //set 4
		[4,10,8,3,6,1,5],   //set 5
		[1,2,11,7,5,3,12],  //set 6
		[8,9,3,5,6,10,7],   //set 7
		[7,11,5,8,12,3,9],  //set 8
		[9,10,2,4,3,1,11],  //set 9
		[5,12,10,8,7,2,4]   //set 10
	];

	function generateLayout(layoutIndex, setIndex)
	{

			//allow optional setindex 1 to 10 to select one of the predefined length sets
		let chosenSet=undefined;
		try
		{
				if(typeof setIndex==='number' && setIndex>=1 && setIndex<=10)
				{
					chosenSet=setIndex-1;
				}
				else
				{
					const params=new URLSearchParams(location.search);
					const s=parseInt(params.get('set')||params.get('data')||'',10);
					if(!isNaN(s) && s>=1 && s<=10)
					{
						chosenSet=s-1;
					}
					else
					{
						//always pick one of the 10 preset data sets randomly if not specified
						chosenSet=randInt(0,9);
					}
				}
			}
			catch(e)
		{
			//fallback to random preset if error
			chosenSet=randInt(0,9);
		}

		const idx=(typeof layoutIndex==='number'&&layoutIndex>=1&&layoutIndex<=layouts.length)?layoutIndex-1:randInt(0,layouts.length-1);

		const layout=layouts[idx];

		const nodes=['A','B','C','D','E','F','G'];

		const tasks={};

		for(const n of nodes)
		{
			//always use preset length from the chosen set
			const map=presetSets[chosenSet];
			const nodeIndex='ABCDEFG'.indexOf(n);
			const len=(nodeIndex>=0 && map[nodeIndex]!=null) ? Number(map[nodeIndex]) : randInt(1,12);

			const pos=layout.positions[n]||['50%','160px'];

			tasks[n]={id:n,len:len,pred:(layout.preds[n]||[]).slice(),succ:[],x:pos[0],y:pos[1]};
		}

		const succCount={};

		for(const n of nodes)
		{
			succCount[n]=0;
		}

		for(const n of nodes)
		{
			const preds=tasks[n].pred;
			const filteredPreds=[];

			for(const p of preds)
			{
				if(tasks[p])
				{
					if(succCount[p]<2)
					{
						tasks[p].succ.push(n);
						succCount[p]++;
						filteredPreds.push(p);
					}
				}
			}

			tasks[n].pred=filteredPreds;
		}

		let compact='';

		for(const n of nodes)
		{
			compact+=n.toLowerCase()+tasks[n].len;
		}

		return{tasks,compact,layoutIndex:idx+1,layoutName:layout.name,setIndex:chosenSet+1};
	}

	global.ChartGen={generateLayout:generateLayout,layoutCount:layouts.length,presetSets:presetSets};

	global.generateLayout=function(i,s)
	{
		return global.ChartGen.generateLayout(i,s);
	};

})(window);
