import { defineComponent, onBeforeUnmount } from 'vue'
import { useProgress } from '@bprogress/vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'RouteProgress',
  setup() {
    const router = useRouter()
    const { start, stop } = useProgress()

    const removeBeforeEach = router.beforeEach(() => start())
    const removeAfterEach = router.afterEach(() => stop())
    const removeOnError = router.onError(() => stop())

    onBeforeUnmount(() => {
      removeBeforeEach()
      removeAfterEach()
      removeOnError()
    })
  },
  render: () => null,
})
