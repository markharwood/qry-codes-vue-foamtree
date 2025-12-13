# ClusterFoamTree

## Props

| Prop name             | Description                                                                                                                                                                                                                                                                                                                | Type                             | Values | Default                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ | ---------------------------------------------------------- |
| vectors               | An array of vector embeddings, each expressed as a Uint8Array.<br/>These must all be of the same length i.e. the same number of dimensions.                                                                                                                                                                                | Array&lt;Uint8Array&gt;          | -      |                                                            |
| minClusterSim         | The minimum similarity connecting all vectors in a cluster.<br/>In practice acceptable values range from 0.5 to 1.<br/>A binary vector resembling random white noise (think of an untuned TV) would <br/>match 50% of bits in typical vectors. That is why no-similarity score around 0.5<br/>while an exact match is 1.   | number                           | -      | 0.7                                                        |
| minDocsPerCluster     | Filters clusters that have less than this number of vectors in it                                                                                                                                                                                                                                                          | number                           | -      | 1                                                          |
| showSlider            | Whether to show the similarity slider control                                                                                                                                                                                                                                                                              | boolean                          | -      | true                                                       |
| clusterContainerClass |                                                                                                                                                                                                                                                                                                                            | string                           | -      | "aos-qry-codes-foamtree-container"                         |
| clusterLabeller       | Function called to provide label strings for each cluster (typically computed using <br/>significant terms - see https://www.npmjs.com/package/@andorsearch/significant-terms)                                                                                                                                             | (cluster: Cluster) =&gt; string  | -      | (cluster: Cluster) =&gt; "Cluster " + cluster.clusterIndex |
| itemLabeller          | Function called to provide label strings for each item.<br/>The itemIndex passed is the index into the array of vectors property for the item.                                                                                                                                                                             | (itemIndex: number) =&gt; string | -      | (itemIndex: number) =&gt; "Item " + itemIndex              |
| minSliderSim          | The minimum similarity used in the slider.<br/>A binary vector resembling random white noise (think of an untuned TV) would <br/>match 50% of bits in typical vectors. That is why no-similarity score is typically around 0.5<br/>while an exact match is 1. The default minimum similarity is set above 50% accordingly. | func                             | -      | (simGraph: SimilarityGraph) =&gt; 0.6                      |

## Events

| Event name           | Properties | Description                                                           |
| -------------------- | ---------- | --------------------------------------------------------------------- |
| similarityGraphBuilt |            | Called whenever the similarity graph is first built.                  |
| clusterClicked       |            | Called when a cluster on the screen is clicked and brought into focus |

## Slots

| Name             | Description                                                                                                 | Bindings |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| sliderHeader     | Slot used for the description shown above the slider input                                                  |          |
| sliderLeftLabel  | Slot used for the description shown to the left of the slider input to indicate low-similarity clustering   |          |
| sliderRightLabel | Slot used for the description shown to the right of the slider input to indicate high-similarity clustering |          |

---
