<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, PropType } from "vue";
import Foamtree from "@carrotsearch/foamtree";
import { ClusterSlider } from "@andorsearch/qry-codes-vue";
import {
    SimilarityGraph,
    buildSimilarityGraph,
    clusterByThreshold,
    mergeVectors
} from "@andorsearch/qry-codes";

export interface Cluster {
    clusterIndex: number;
    indices: number[];
    mergedVector: Uint8Array;
    score: number;
}

const emit = defineEmits<{
    /**
     * Called whenever the similarity graph is first built.
     */
    similarityGraphBuilt: [simGraph: SimilarityGraph];
    /**
     * Called when a cluster on the screen is clicked and brought into focus
     */
    clusterClicked: [clusterIndex: number, label: string, vectorIndices: number[]];
}>();

const props = defineProps({
    /**
      * An array of vector embeddings, each expressed as a Uint8Array.
      * These must all be of the same length i.e. the same number of dimensions.
    */
    vectors: { type: Array<Uint8Array>, required: true },
    /**
      * The minimum similarity connecting all vectors in a cluster.
      * In practice acceptable values range from 0.5 to 1.
      * A binary vector resembling random white noise (think of an untuned TV) would 
      * match 50% of bits in typical vectors. That is why no-similarity score around 0.5
      * while an exact match is 1.
    */
    minClusterSim: { type: Number, default: 0.7 },
    /**
      * Filters clusters that have less than this number of vectors in it
    */
    minDocsPerCluster: { type: Number, default: 1 },
    /**
      * Whether to show the similarity slider control
    */
    showSlider: { type: Boolean, default: true },
    clusterContainerClass: {
        type: String,
        default: "aos-qry-codes-foamtree-container"
    },
    /**
      * Function called to provide label strings for each cluster (typically computed using 
      * significant terms - see  https://www.npmjs.com/package/@andorsearch/significant-terms)
    */
    clusterLabeller: {
        type: Function as PropType<(cluster: Cluster) => string>,
        required: false,
        default: (cluster: Cluster) => "Cluster " + cluster.clusterIndex
    },
    /**
      * Function called to provide label strings for each item.
      * The itemIndex passed is the index into the array of vectors property for the item.
    */
    itemLabeller: {
        type: Function as PropType<(itemIndex: number) => string>,
        required: false,
        default: (itemIndex: number) => "Item " + itemIndex
    },
    /**
      * The minimum similarity used in the slider.
      * A binary vector resembling random white noise (think of an untuned TV) would 
      * match 50% of bits in typical vectors. That is why no-similarity score is typically around 0.5
      * while an exact match is 1. The default minimum similarity is set above 50% accordingly.
    */
    minSliderSim: {
        type: Function,
        required: false,
        default: (simGraph: SimilarityGraph) => 0.6
    }
});

// ---------------- state ----------------
const sliderSim = ref(props.minClusterSim);
const minFoundSim = ref(0);
const maxFoundSim = ref(1);
const clusters = ref<Cluster[]>([]);
const foamtree = ref<any>(null);
const container = ref<HTMLDivElement | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

let simGraph: SimilarityGraph | undefined = undefined;

// ---------------- clustering ----------------
function clusterResults() {
    let max = 0;
    let min = 1;
    if (!simGraph) {
        simGraph = buildSimilarityGraph(props.vectors);
        simGraph.edgeScores.forEach(cluster => {
            cluster.forEach(score => {
                max = Math.max(score, max);
                min = Math.min(score, min);
            });
        });
        minFoundSim.value = Math.max(props.minSliderSim(), min);
        maxFoundSim.value = max;
        emit("similarityGraphBuilt", simGraph);
    }

    const unsortedClusters: Cluster[] = [];
    let clusteredIDs = clusterByThreshold(simGraph, sliderSim.value);
    let tooSmallClusters = clusteredIDs.filter(c => c.length < props.minDocsPerCluster);
    clusteredIDs = clusteredIDs.filter(c => c.length >= props.minDocsPerCluster);
    clusteredIDs.forEach((clusterIndices, clusterIndex) => {
        const clusterEmbeddings = clusterIndices.map(i => props.vectors[i]);
        const merged = mergeVectors(clusterEmbeddings);
        const cluster: Cluster = {
            clusterIndex,
            indices: clusterIndices,
            mergedVector: merged,
            score: 0
        };
        cluster.score = cluster.indices.length
        unsortedClusters.push(cluster);
    });
    clusters.value = unsortedClusters.sort((a, b) => b.score - a.score);
}

// ---------------- FoamTree data ----------------
function buildFoamData() {
    return {
        groups: clusters.value.map((cluster, i) => {
            const result: any = {
                id: `cluster-${i}`,
                label: props.clusterLabeller(cluster),
                // Make single-doc clusters significantly smaller than clustered docs
                weight: cluster.indices.length == 1 ? 0.1 : cluster.indices.length,
                clusterIndex: i
            };
            if (cluster.indices.length > 1) {
                result.groups = cluster.indices.map((vectorIndex, elementNumber) => ({
                    id: `cluster-${i}-item-${elementNumber}`,
                    label: props.itemLabeller(vectorIndex),
                    vectorIndex,
                    elementNumber,
                    clusterIndex: i
                }));
            } else {
                result.groups = [];
                result.docID = cluster.indices[0]
                // result.groupLabelFontWeight ="lighter"
            }
            return result;
        })
    };
}

// ---------------- FoamTree creation ----------------
function renderFoamTree() {
    if (!container.value) return;

    // Dispose any previous instance
    if (foamtree.value) {
        try {
            foamtree.value.dispose();
        } catch (e) {
            console.log("FoamTree dispose failed", e);
        }
        foamtree.value = null;
    }

    foamtree.value = new Foamtree({
        element: container.value,
        dataObject: buildFoamData(),
        layout: "relaxed",
        stacking: "hierarchical",
        groupFillType: "gradient",
        groupLabelFontFamily: "Inter, sans-serif",
        groupLabelFontWeight: "600",
        groupLabelMinFontSize: 8,
        groupLabelMaxFontSize: 22,
        relaxationVisible: true,
        rolloutDuration: 0,
        pullbackDuration: 0,
        fadeDuration: 0,

        groupSelectionOutlineWidth: 1,

        // Without this setting there was a delay showing labels when zoomed in. 
        wireframeLabelDrawing: "always",
        openOnClick: false,
        closeOnOutsideClick: false,
        multiSelection: false,
        // Rounded corners are nice but produced dodgy artefacts on high zoom - the lines overshot
        // groupBorderRadius: 1.5,
        groupBorderRadius: 1,
        groupStrokeWidth: 1,
        exposeDuration: 400,
        rolloutLabelDuration: 0,
        rolloutLabelDelay: 0,
        interactionHandler: "external",
        groupColorDecorator: (_opts:any, props:any, vars:any) => {
            const g = props.group;

            // Only top-level groups with no children (your 1-doc clusters)
            const isSingletonCluster =
                (!g.groups || g.groups.length === 0) && g.clusterIndex != null;

            if (isSingletonCluster) {
                // Dim the label color
                vars.labelColor = "rgba(0,0,0,0.55)";
                // Also lighten the polygon itself a bit
                if (vars.groupColor && typeof vars.groupColor === "object") {
                    vars.groupColor.l = Math.min(100, vars.groupColor.l + 35);
                }
            }
        }
    });

    const ft = foamtree.value;

    // Cluster selection / expose behaviour
    ft.on("groupSelectionChanged", (info: any) => {
        if (!foamtree.value) return;

        if (info.groups.length === 0) {
            // Click outside clusters -> clear exposure
            ft.expose([]);
            return;
        }

        const group = info.groups[0];

        const exposed = ft.get("exposure");
        if (exposed.groups && exposed.groups.length > 0) {
            const currentId = exposed.groups[0].id;
            if (group.id === currentId) {
                // Toggle off if the same cluster is clicked again
                ft.expose([]);
                return;
            }
        }

        ft.expose(group.id).then(() => {
            if (group.groups && group.groups.length > 1) {
                emit(
                    "clusterClicked",
                    group.clusterIndex,
                    group.label,
                    group.groups.map((g: any) => g.vectorIndex)
                );
            } else {
                emit(
                    "clusterClicked",
                    group.clusterIndex,
                    group.label,
                    [group.docID]
                );
            }
        });
    });
}

// ---------------- Pointer / wheel handling (external interaction) ----------------
const TAP_TOLERANCE = 6;

// Pointer gesture state (shared for mouse + touch)
const pointers = new Map<number, { x: number; y: number; type: "mouse" | "touch" }>();
const startPos = new Map<number, { x: number; y: number }>();
let baseDist = 0;
let dragging = false;
let transforming = false;

function rel(ev: PointerEvent | WheelEvent) {
    if (!container.value) return { x: 0, y: 0 };
    const r = container.value.getBoundingClientRect();
    return { x: (ev as PointerEvent).clientX - r.left, y: (ev as PointerEvent).clientY - r.top };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function onPointerDown(ev: PointerEvent) {
    if (!foamtree.value) return;
    // Primary button only for mouse
    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    const p = rel(ev);
    pointers.set(ev.pointerId, { ...p, type: ev.pointerType as "mouse" | "touch" });
    startPos.set(ev.pointerId, p);

    if (pointers.size >= 2) {
        const [aRaw, bRaw] = Array.from(pointers.values());
        const a = { x: aRaw.x, y: aRaw.y };
        const b = { x: bRaw.x, y: bRaw.y };
        baseDist = dist(a, b);
        transforming = true;
        foamtree.value.trigger("transformstart", { ...a, secondary: true });
    } else {
        dragging = false;
    }
}

function onPointerMove(ev: PointerEvent) {
    if (!foamtree.value) return;
    if (!pointers.has(ev.pointerId)) return;

    const p = rel(ev);
    const meta = pointers.get(ev.pointerId)!;
    pointers.set(ev.pointerId, { ...p, type: meta.type });

    if (pointers.size === 1 && !transforming) {
        const s = startPos.get(ev.pointerId)!;
        if (!dragging && dist(p, s) > TAP_TOLERANCE) {
            dragging = true;
            foamtree.value.trigger("dragstart", p);
        }
        if (dragging) {
            foamtree.value.trigger("drag", p);
        }
    } else if (pointers.size === 2) {
        const [aRaw, bRaw] = Array.from(pointers.values());
        const a = { x: aRaw.x, y: aRaw.y };
        const b = { x: bRaw.x, y: bRaw.y };
        const scale = dist(a, b) / baseDist;
        foamtree.value.trigger("transform", { ...a, scale, secondary: true });
    }
}

function onPointerUp(ev: PointerEvent) {
    if (!foamtree.value) return;

    const p = rel(ev);

    if (transforming) {
        foamtree.value.trigger("transformend", p);
    }
    if (dragging) {
        foamtree.value.trigger("dragend", p);
    }

    pointers.delete(ev.pointerId);
    startPos.delete(ev.pointerId);

    if (!dragging && !transforming) {
        foamtree.value.trigger("click", p);
    }

    if (pointers.size === 0) {
        dragging = false;
        transforming = false;
    }
}

function onWheel(ev: WheelEvent) {
    if (!foamtree.value) return;
    ev.preventDefault();
    const p = rel(ev);
    const scale = ev.deltaY < 0 ? 1.03 : 0.97;
    foamtree.value.trigger("transformstart", { ...p, secondary: true });
    foamtree.value.trigger("transform", { ...p, secondary: true, scale });
    foamtree.value.trigger("transformend", { ...p, secondary: true });
}

// ---------------- lifecycle ----------------
onMounted(() => {
    clusterResults();

    nextTick(() => {
        renderFoamTree();

        if (container.value) {
            const el = container.value;

            // Attach pointer + wheel listeners once
            el.addEventListener("pointerdown", onPointerDown);
            el.addEventListener("pointermove", onPointerMove);
            el.addEventListener("pointerup", onPointerUp);
            el.addEventListener("pointercancel", onPointerUp);
            el.addEventListener("wheel", onWheel, { passive: false });

            // ResizeObserver to keep FoamTree in sync with container size
            resizeObserver.value = new ResizeObserver(() => {
                if (foamtree.value) {
                    foamtree.value.resize();
                }
            });
            resizeObserver.value.observe(el);

        }
    });
});

onBeforeUnmount(() => {
    if (container.value) {
        const el = container.value;
        el.removeEventListener("pointerdown", onPointerDown);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onPointerUp);
        el.removeEventListener("pointercancel", onPointerUp);
        el.removeEventListener("wheel", onWheel);
    }

    if (resizeObserver.value) {
        resizeObserver.value.disconnect();
        resizeObserver.value = null;
    }

    try {
        if (foamtree.value) {
            foamtree.value.dispose();
        }
    } catch (e) {
        console.log("Failed disposal", e);
    }
    foamtree.value = null;
});

// ---------------- watchers ----------------
watch(sliderSim, () => {
    if (sliderSim.value !== props.minClusterSim) {
        clusterResults();
        nextTick(() => foamtree.value?.set("dataObject", buildFoamData()));
    }
});


</script>

<template>
    <div class="qry-foamtree-root">
        <div class="aos-sliderContainer">
            <ClusterSlider v-if="showSlider" v-model="sliderSim" :min="minFoundSim" :max="maxFoundSim + 0.05"
                :thumbSize="24">
                <template #header>
                    <!-- @slot Slot used for the description shown above the slider input
                    -->
                    <slot name="sliderHeader">
                        <span class="aos-sliderLabel">Grouping style</span>
                    </slot>
                </template>
                <template #leftLabel>
                    <!-- @slot Slot used for the description shown to the left of the slider input to indicate low-similarity clustering
                        -->
                    <slot name="sliderLeftLabel"></slot>
                </template>
                <template #rightLabel>
                    <!-- @slot Slot used for the description shown to the right of the slider input to indicate high-similarity clustering
                    -->
                    <slot name="sliderRightLabel"></slot>
                </template>
            </ClusterSlider>
        </div>
        <div ref="container" :class="clusterContainerClass"></div>
    </div>
</template>

<style>
.aos-sliderLabel {
    font-weight: bold;
    color: black;
}

.aos-qry-codes-foamtree-container {
    position: relative;

    flex: 1 1 auto;
    /* fill available space in flex parent */
    width: 100%;
    height: 100%;
    min-height: 200px;
    /* fallback so it's never 0 */
    min-width: 0;

    touch-action: none;
    /* stop page scroll when panning */
    overscroll-behavior: none;
}

/* Safari-safe override for FoamTree's internal wrapper */
.aos-qry-codes-foamtree-container[data-foamtree="embedded"]>div {
    position: static !important;
    /* or 'unset' */
}

.aos-sliderContainer {
    padding: 5px;
    padding-top: 0px;
    position: absolute;
    bottom: 40px;
    left: 10px;
    z-index: 100;
    background-color: #ffffffde;
    border-radius: 9px;
}

.aos-sliderContainer span {
    color: black;
}
</style>

<style scoped>
.qry-foamtree-root {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    /* height: 100%; */
    min-height: 0;
    position: relative;
}
</style>