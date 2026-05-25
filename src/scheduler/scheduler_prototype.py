import asyncio
import sys
import logging
from collections import deque
from typing import List, Dict, Optional

# Reconfigure stdout/stderr to support Unicode/UTF-8 emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configure clean terminal logging to stdout
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    stream=sys.stdout
)
logger = logging.getLogger("MatrixScheduler")

# Ground truth agent states database (simulates disk storage for agents' attention history)
agent_states_db: Dict[str, List[str]] = {}

class LRUKCache:
    """
    LRU-K Cache implementation for tracking agent attention history contexts.
    Eviction is based on the K-th backward reference distance.
    """
    def __init__(self, capacity: int, k: int = 2):
        self.capacity = capacity
        self.k = k
        self.cache = {}             # key (agent_id) -> value (attention_history)
        self.access_history = {}    # key (agent_id) -> list of access count timestamps
        self.access_count = 0

    def get(self, key: str) -> Optional[List[str]]:
        if key not in self.cache:
            return None
        self.access_count += 1
        self._record_access(key)
        return self.cache[key]

    def put(self, key: str, value: List[str]):
        self.access_count += 1
        
        # If the key is already in the cache, update it and record access
        if key in self.cache:
            self.cache[key] = value
            self._record_access(key)
            return

        # If cache is full, evict a key before insertion
        if len(self.cache) >= self.capacity:
            self._evict()

        self.cache[key] = value
        self._record_access(key)

    def _record_access(self, key: str):
        if key not in self.access_history:
            self.access_history[key] = []
        self.access_history[key].append(self.access_count)
        # Keep only the last K access times
        if len(self.access_history[key]) > self.k:
            self.access_history[key].pop(0)

    def _evict(self):
        victim = None
        inf_keys = []
        
        # Identify keys with less than K accesses (their K-th distance is infinity)
        for key in self.cache:
            history = self.access_history.get(key, [])
            if len(history) < self.k:
                inf_keys.append(key)

        if inf_keys:
            # Evict the one with the earliest first access time
            victim = min(inf_keys, key=lambda k: self.access_history[k][0] if self.access_history[k] else 0)
        else:
            # All keys have at least K accesses. Evict the one with the earliest K-th last access time (index 0)
            victim = min(self.cache.keys(), key=lambda k: self.access_history[k][0])

        if victim:
            del self.cache[victim]
            if victim in self.access_history:
                del self.access_history[victim]
            logger.info(f"💾 [Cache Eviction] LRU-{self.k} cache full. Evicted state for agent '{victim}'")


class AgentTask:
    """
    Represents an agent task scheduled on the M.A.T.R.I.X. AI-OS Kernel.
    """
    def __init__(self, agent_id: str, task_name: str, duration: float, 
                 task_complexity: float, urgency: float, 
                 resource_requirements: float, user_priority: float,
                 attention_history: List[str] = None):
        self.agent_id = agent_id
        self.task_name = task_name
        self.duration = duration
        self.remaining_time = duration
        self.task_complexity = task_complexity
        self.urgency = urgency
        self.resource_requirements = resource_requirements
        self.user_priority = user_priority
        self.priority = self.calculate_priority()
        self.attention_history = attention_history or []
        self.executed_time = 0.0

    def calculate_priority(self) -> float:
        """
        Dynamically calculate priority based on:
        - task_complexity (20%)
        - urgency (40%)
        - resource_requirements (10%)
        - user_priority (30%)
        """
        return round(
            (self.task_complexity * 0.2) + 
            (self.urgency * 0.4) + 
            (self.resource_requirements * 0.1) + 
            (self.user_priority * 0.3), 
            2
        )

    def __repr__(self):
        return (f"AgentTask(Agent='{self.agent_id}', Task='{self.task_name}', "
                f"Dur={self.duration:.1f}s, Rem={self.remaining_time:.1f}s, Priority={self.priority})")


class AgentScheduler:
    """
    Base Agent Scheduler class for the M.A.T.R.I.X. Kernel.
    """
    def __init__(self, cache_capacity: int = 2, cache_k: int = 2):
        self.cache = LRUKCache(capacity=cache_capacity, k=cache_k)

    def add_task(self, task: AgentTask):
        raise NotImplementedError

    async def context_switch(self, from_task: Optional[AgentTask], to_task: AgentTask):
        logger.info(f"🔄 [Context Switch] Preparing switch to agent '{to_task.agent_id}'...")
        
        # 1. Save state of the active task (if any)
        if from_task:
            state_to_save = list(from_task.attention_history)
            agent_states_db[from_task.agent_id] = state_to_save
            self.cache.put(from_task.agent_id, state_to_save)
            logger.info(f"💾 [Context Switch] Saved attention history for '{from_task.agent_id}' to cache/disk. State: {state_to_save}")
            await asyncio.sleep(0.05)  # Simulated context saving overhead

        # 2. Load state of the next task
        cached_state = self.cache.get(to_task.agent_id)
        if cached_state is not None:
            logger.info(f"⚡ [Context Switch] Cache HIT (LRU-{self.cache.k}): Restored state for '{to_task.agent_id}': {cached_state}")
            to_task.attention_history = list(cached_state)
        else:
            disk_state = agent_states_db.get(to_task.agent_id, [])
            logger.info(f"🔍 [Context Switch] Cache MISS: '{to_task.agent_id}' state not in cache. Loading from Disk...")
            await asyncio.sleep(0.15)  # Simulated disk seek and loading delay
            logger.info(f"📖 [Context Switch] Restored state from Disk for '{to_task.agent_id}': {disk_state}")
            to_task.attention_history = list(disk_state)
            self.cache.put(to_task.agent_id, to_task.attention_history)

        logger.info(f"🚀 [Context Switch] Complete: Agent '{to_task.agent_id}' is now active.\n" + "-"*60)

    async def run(self):
        raise NotImplementedError


class FIFOScheduler(AgentScheduler):
    """
    First-In, First-Out (FIFO) Scheduler: Non-preemptive execution in order of arrival.
    """
    def __init__(self, cache_capacity: int = 2, cache_k: int = 2):
        super().__init__(cache_capacity, cache_k)
        self.queue = deque()

    def add_task(self, task: AgentTask):
        self.queue.append(task)
        logger.info(f"📥 [FIFO Queue] Queued task: '{task.task_name}' for agent '{task.agent_id}'")

    async def run(self):
        logger.info("🎬 Starting FIFO Scheduler execution...")
        active_task = None

        while self.queue:
            next_task = self.queue.popleft()
            await self.context_switch(active_task, next_task)
            active_task = next_task

            logger.info(f"⏳ Running task '{active_task.task_name}' ({active_task.agent_id}) for {active_task.remaining_time}s...")
            steps = int(active_task.remaining_time * 2)
            for step in range(steps):
                await asyncio.sleep(0.05)  # scaled down for faster simulation
                active_task.executed_time += 0.5
                active_task.remaining_time = max(0.0, active_task.remaining_time - 0.5)
                action = f"FIFO step {step+1}/{steps} for {active_task.task_name}"
                active_task.attention_history.append(action)
                logger.info(f"   [Running] '{active_task.agent_id}': {action}")

            logger.info(f"✅ Completed task '{active_task.task_name}' for agent '{active_task.agent_id}'")
            active_task.attention_history.append(f"Completed '{active_task.task_name}'")

        if active_task:
            # Save final active task state
            state_to_save = list(active_task.attention_history)
            agent_states_db[active_task.agent_id] = state_to_save
            self.cache.put(active_task.agent_id, state_to_save)
            logger.info(f"💾 Saved final state of '{active_task.agent_id}' to cache/disk.")

        logger.info("🏁 FIFO Scheduler execution finished.")


class RoundRobinScheduler(AgentScheduler):
    """
    Round Robin (RR) Scheduler: Preemptive execution with a maximum time quantum.
    """
    def __init__(self, time_slice: float = 1.0, cache_capacity: int = 2, cache_k: int = 2):
        super().__init__(cache_capacity, cache_k)
        self.time_slice = time_slice
        self.queue = deque()

    def add_task(self, task: AgentTask):
        self.queue.append(task)
        logger.info(f"📥 [Round Robin Queue] Queued task: '{task.task_name}' for agent '{task.agent_id}'")

    async def run(self):
        logger.info(f"🎬 Starting Round Robin Scheduler execution (Quantum={self.time_slice}s)...")
        active_task = None

        while self.queue:
            next_task = self.queue.popleft()
            
            # Switch context if we are moving to a different agent
            if active_task is None or next_task.agent_id != active_task.agent_id:
                await self.context_switch(active_task, next_task)
            
            active_task = next_task
            slice_dur = min(self.time_slice, active_task.remaining_time)
            
            logger.info(f"⏳ Running task '{active_task.task_name}' ({active_task.agent_id}) for quantum slice of {slice_dur}s...")
            
            steps = int(slice_dur * 2)
            for step in range(steps):
                await asyncio.sleep(0.05)  # scaled down for faster simulation
                active_task.executed_time += 0.5
                active_task.remaining_time = max(0.0, active_task.remaining_time - 0.5)
                action = f"RR slice step {step+1}/{steps} for {active_task.task_name}"
                active_task.attention_history.append(action)
                logger.info(f"   [Running] '{active_task.agent_id}': {action} ({max(active_task.remaining_time, 0.0):.1f}s left)")

            if active_task.remaining_time <= 0.01:
                logger.info(f"✅ Completed task '{active_task.task_name}' for agent '{active_task.agent_id}'")
                active_task.attention_history.append(f"Completed '{active_task.task_name}'")
            else:
                logger.info(f"⏱️ Quantum expired. Preempting task '{active_task.task_name}' for '{active_task.agent_id}'")
                active_task.attention_history.append(f"Preempted. Executed={active_task.executed_time:.1f}s")
                self.queue.append(active_task)

        if active_task:
            # Save final active task state
            state_to_save = list(active_task.attention_history)
            agent_states_db[active_task.agent_id] = state_to_save
            self.cache.put(active_task.agent_id, state_to_save)
            logger.info(f"💾 Saved final state of '{active_task.agent_id}' to cache/disk.")

        logger.info("🏁 Round Robin Scheduler execution finished.")


class PriorityScheduler(AgentScheduler):
    """
    Priority Scheduler: Schedules tasks with the highest dynamic priority.
    Incorporates aging to prevent starvation of lower-priority tasks.
    """
    def __init__(self, cache_capacity: int = 2, cache_k: int = 2):
        super().__init__(cache_capacity, cache_k)
        self.queue: List[AgentTask] = []

    def add_task(self, task: AgentTask):
        self.queue.append(task)
        logger.info(f"📥 [Priority Queue] Queued task: '{task.task_name}' ({task.agent_id}) | Priority = {task.priority}")

    async def run(self):
        logger.info("🎬 Starting Priority Scheduler execution (with Aging)...")
        active_task = None

        while self.queue:
            # Recalculate priorities and sort descending
            for task in self.queue:
                task.priority = task.calculate_priority()
            self.queue.sort(key=lambda t: t.priority, reverse=True)

            logger.info("📋 Current Priority Queue:")
            for t in self.queue:
                logger.info(f"   - Agent: '{t.agent_id}' | Priority: {t.priority:.2f} (Urgency: {t.urgency:.1f})")

            next_task = self.queue.pop(0)
            await self.context_switch(active_task, next_task)
            active_task = next_task

            logger.info(f"⏳ Running task '{active_task.task_name}' ({active_task.agent_id}) [Priority={active_task.priority}] for {active_task.remaining_time}s...")
            steps = int(active_task.remaining_time * 2)
            for step in range(steps):
                await asyncio.sleep(0.05)  # scaled down
                active_task.executed_time += 0.5
                active_task.remaining_time = max(0.0, active_task.remaining_time - 0.5)
                action = f"Priority step {step+1}/{steps} for {active_task.task_name}"
                active_task.attention_history.append(action)
                logger.info(f"   [Running] '{active_task.agent_id}': {action}")

            logger.info(f"✅ Completed task '{active_task.task_name}' for agent '{active_task.agent_id}'")
            active_task.attention_history.append(f"Completed '{active_task.task_name}'")

            # Apply Aging: Increase urgency of all waiting tasks by 0.8 to prevent starvation
            for task in self.queue:
                old_urgency = task.urgency
                task.urgency = min(10.0, task.urgency + 0.8)
                task.priority = task.calculate_priority()
                logger.info(f"📈 [Aging] Starvation defense: Increased urgency of '{task.agent_id}' to {task.urgency:.1f} (New Priority = {task.priority})")

        if active_task:
            state_to_save = list(active_task.attention_history)
            agent_states_db[active_task.agent_id] = state_to_save
            self.cache.put(active_task.agent_id, state_to_save)
            logger.info(f"💾 Saved final state of '{active_task.agent_id}' to cache/disk.")

        logger.info("🏁 Priority Scheduler execution finished.")


class SJFScheduler(AgentScheduler):
    """
    Shortest Job First (SJF) Scheduler: Non-preemptive scheduler executing shortest tasks first.
    """
    def __init__(self, cache_capacity: int = 2, cache_k: int = 2):
        super().__init__(cache_capacity, cache_k)
        self.queue: List[AgentTask] = []

    def add_task(self, task: AgentTask):
        self.queue.append(task)
        logger.info(f"📥 [SJF Queue] Queued task: '{task.task_name}' for agent '{task.agent_id}' (Duration={task.duration}s)")

    async def run(self):
        logger.info("🎬 Starting Shortest Job First (SJF) Scheduler execution...")
        active_task = None

        while self.queue:
            # Sort queue ascending by remaining time
            self.queue.sort(key=lambda t: t.remaining_time)

            logger.info("📋 Current SJF Queue:")
            for t in self.queue:
                logger.info(f"   - Agent: '{t.agent_id}' | Remaining Time: {t.remaining_time:.1f}s")

            next_task = self.queue.pop(0)
            await self.context_switch(active_task, next_task)
            active_task = next_task

            logger.info(f"⏳ Running task '{active_task.task_name}' ({active_task.agent_id}) for {active_task.remaining_time}s...")
            steps = int(active_task.remaining_time * 2)
            for step in range(steps):
                await asyncio.sleep(0.05)  # scaled down
                active_task.executed_time += 0.5
                active_task.remaining_time = max(0.0, active_task.remaining_time - 0.5)
                action = f"SJF step {step+1}/{steps} for {active_task.task_name}"
                active_task.attention_history.append(action)
                logger.info(f"   [Running] '{active_task.agent_id}': {action}")

            logger.info(f"✅ Completed task '{active_task.task_name}' for agent '{active_task.agent_id}'")
            active_task.attention_history.append(f"Completed '{active_task.task_name}'")

        if active_task:
            state_to_save = list(active_task.attention_history)
            agent_states_db[active_task.agent_id] = state_to_save
            self.cache.put(active_task.agent_id, state_to_save)
            logger.info(f"💾 Saved final state of '{active_task.agent_id}' to cache/disk.")

        logger.info("🏁 SJF Scheduler execution finished.")


def create_mock_tasks() -> List[AgentTask]:
    return [
        AgentTask(
            agent_id="Security Auditor",
            task_name="Vulnerability Scan",
            duration=2.0,
            task_complexity=8.0,
            urgency=9.0,
            resource_requirements=5.0,
            user_priority=7.0
        ),
        AgentTask(
            agent_id="Wine Translator",
            task_name="Translate win32 API call",
            duration=1.0,
            task_complexity=4.0,
            urgency=3.0,
            resource_requirements=3.0,
            user_priority=5.0
        ),
        AgentTask(
            agent_id="Filesystem Stripper",
            task_name="Purge temp caches",
            duration=1.5,
            task_complexity=5.0,
            urgency=6.0,
            resource_requirements=8.0,
            user_priority=4.0
        ),
        AgentTask(
            agent_id="Network Guard",
            task_name="Inspect inbound traffic",
            duration=2.5,
            task_complexity=7.0,
            urgency=8.0,
            resource_requirements=6.0,
            user_priority=9.0
        )
    ]


def reset_simulation():
    global agent_states_db
    agent_states_db = {
        "Security Auditor": ["Audited port rules", "Found open port 22"],
        "Wine Translator": ["Mapped kernel32.dll", "Ready for syscall mapping"],
        "Filesystem Stripper": ["Mapped /var/tmp", "Detected duplicate node logs"],
        "Network Guard": ["Tuned interface eth0", "Listening on socket 8080"]
    }
    return create_mock_tasks()


async def run_simulation_suite():
    # Run each scheduler algorithm in turn with fresh mock tasks and database state
    
    # 1. FIFO
    logger.info("\n" + "="*80 + "\n🔥 TEST SIMULATION: FIRST-IN, FIRST-OUT (FIFO) SCHEDULER\n" + "="*80)
    tasks = reset_simulation()
    fifo = FIFOScheduler(cache_capacity=2, cache_k=2)
    for t in tasks:
        fifo.add_task(t)
    await fifo.run()
    
    # 2. Round Robin
    logger.info("\n" + "="*80 + "\n🔥 TEST SIMULATION: ROUND ROBIN (RR) SCHEDULER\n" + "="*80)
    tasks = reset_simulation()
    rr = RoundRobinScheduler(time_slice=1.0, cache_capacity=2, cache_k=2)
    for t in tasks:
        rr.add_task(t)
    await rr.run()

    # 3. Priority
    logger.info("\n" + "="*80 + "\n🔥 TEST SIMULATION: PRIORITY SCHEDULER (WITH AGING)\n" + "="*80)
    tasks = reset_simulation()
    priority_sched = PriorityScheduler(cache_capacity=2, cache_k=2)
    for t in tasks:
        priority_sched.add_task(t)
    await priority_sched.run()

    # 4. SJF
    logger.info("\n" + "="*80 + "\n🔥 TEST SIMULATION: SHORTEST JOB FIRST (SJF) SCHEDULER\n" + "="*80)
    tasks = reset_simulation()
    sjf = SJFScheduler(cache_capacity=2, cache_k=2)
    for t in tasks:
        sjf.add_task(t)
    await sjf.run()


if __name__ == "__main__":
    asyncio.run(run_simulation_suite())
