## Setting up GRAFT


- git clone <https://github.com/shoaibakramm/Graft.git>
- cd tree-component-assignment
- npm install
- npm run dev


- Then open the URL printed in the terminal (usually http://localhost:5173).


## Trying GRAFT

- Upload a CSV or Excel file. The app detects which format it is and renders the tree. Three formats are supported:

#### Standard — explicit parent references

```
id,name,parentId,department,level,metadata
n1,Amara Osei,,Executive,1,Chief Executive
n2,Ravi Chandra,n1,Technology,2,CTO
n3,Priya Nair,n2,Technology,3,VP Engineering
```


#### Path — hierarchy encoded in a path string, no id or parent column

```
path,label,type,owner
/company,Amara Osei,root,Executive
/company/tech,Ravi Chandra,division,Technology
/company/tech/eng,Priya Nair,team,Technology
```


#### Pivot / BI export — one row per branch, nodes deduplicated out of it

```
Level 1,Level 2,Level 3,Headcount,Budget
Amara Osei,Ravi Chandra,Priya Nair,12,850000
Amara Osei,Ravi Chandra,Diego Marquez,8,620000
Amara Osei,Marcus Webb,,2,150000
```


- The test files are provided in the Test_files folder.
- All three produce the same tree...


