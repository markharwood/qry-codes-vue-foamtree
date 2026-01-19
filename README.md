# QRy-codes Vue FoamTree Component

Vue 3 component for clustering [qry-codes](http://qry.codes) and visualizing them using [FoamTree](https://carrotsearch.com/foamtree/)
Useful for search applications built using BinaryVectors.

## Installation

```sh
npm install @andorsearch/qry-codes-vue-foamtree
```
Add styles by importing stylesheets:
```typescript
import '@andorsearch/qry-codes-vue/dist/style.css';
import '@andorsearch/qry-codes-vue-foamtree/dist/style.css';

```


## Components
* [ClusterFoamTree](https://github.com/markharwood/qry-codes-vue-foamtree/blob/main/docs/src/components/ClusterFoamTree.md) for clustering similar vectors interactively with a similarity threshold slider


## Usage

Check out a demo at https://news.inperspective.com

Applications will typically load data in JSON form with the binary embeddings encoded
as hex or base64 strings. These need to be converted into Uint8Array objects for use
in clustering algorithms. The 'bytesConversion' object offers "fromBase64" and "fromHex"
helper functions to aid in this:


```typescript
import { bytesConversion } from "@andorsearch/qry-codes"
let myDocs = ref<any[]>([])

async function loadData() {
  const data = await fetch("/mydata/myDocs.json");
  const json = await data.json()
  json.forEach(doc => {
    // Replace simple string objects loaded in json with Uint8Array binary vectors
    doc["embedding"] = bytesConversion.fromBase64(doc["embedding"])
    myDocs.value.push(doc)
  })
}
onMounted(() => {
  loadData()
});
```
Once loaded, the data can be passed to the ClusterFoamTree component for clustering and visualization.
Clusters of related articles are grouped using a form of Voronoi map. When a cluster is clicked it is 
given a highlighted focus and applications can show detailed document information by handling the clusterClicked event.


```typescript
import {ClusterFoamTree} from "@andorsearch/qry-codes-vue-foamtree"

    <ClusterFoamTree v-if="myDocs.length > 0" :vectors="myDocs.map(doc => doc['embedding'])"
          :clusterLabeller="getFoamTreeClusterLabel"
          :itemLabeller="getFoamTreeItemLabel"
          @clusterClicked="foamTreeClusterClicked"
    >
    </ClusterFoamTree>

```

The helper functions shown above are called to fetch suitable text strings for labelling elements.
Some example implementations are shown below:
```typescript

function getFoamTreeItemLabel(vectorIndex:number){
  // assuming our documents have a "headline" text property
  return myDocs[vectorIndex].headline
}

function getFoamTreeClusterLabel(cluster:any):string{
    // Simplistic implementation labels cluster with label of the first item in the cluster
    return getFoamTreeItemLabel(cluster.indices[0])
}

```

The clusterClicked event is useful for drilling down to details within a cluster (See [newsmap](https://news.inperspective.com) for an example )





