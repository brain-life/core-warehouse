<template>
<span v-if="app_">
    <appavatar :app="app_" :height="20" :width="20"></appavatar>
    {{app_.name}}
</span>
</template>

<script>
import Vue from 'vue'

import appavatar from '@/components/appavatar'
import appcache from '@/mixins/appcache'

export default {
    mixins: [ appcache ],
    components: { appavatar },
    props: {
        app: Object,
        appid: String,
    },
    data() {
        return {
            app_: null
        }
    },
    created: function() {
        if(this.appid) {
            this.appcache(this.appid, (err, app)=>{
                this.app_ = app;
            });
        }
        if(this.app) this.app_ = this.app;
    },
}
</script>


