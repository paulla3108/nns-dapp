//! Memory Layout
use core::borrow::Borrow;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, Memory};

use crate::accounts_store::schema::SchemaLabel;

use super::State;

/// Memory layout consisting of a memory manager and some virtual memory.
pub struct Partitions {
    pub memory_manager: MemoryManager<DefaultMemoryImpl>,
}
impl Partitions {
    /// The partition containing metadata such as schema version.
    pub const METADATA_MEMORY_ID: MemoryId = MemoryId::new(0);
    /// The partition containing heap data
    pub const HEAP_MEMORY_ID: MemoryId = MemoryId::new(1);

    /// Determines whether the given memory is managed by a memory manager.
    fn is_managed(memory: &DefaultMemoryImpl) -> bool {
        dfn_core::api::print(format!("START memory is_managed: ()"));
        let memory_pages = memory.size();
        if memory_pages == 0 {
            return false;
        }
        // TODO: This is private in ic-stable-structures.  We should make it public, or have a public method for determining whether there is a memory manager at a given offset.
        const MEMORY_MANAGER_MAGIC_BYTES: &[u8; 3] = b"MGR"; // From the spec: https://docs.rs/ic-stable-structures/0.6.0/ic_stable_structures/memory_manager/struct.MemoryManager.html#v1-layout
        let mut actual_first_bytes = [0u8; MEMORY_MANAGER_MAGIC_BYTES.len()];
        memory.read(0, &mut actual_first_bytes);
        let ans = actual_first_bytes == *MEMORY_MANAGER_MAGIC_BYTES;
        dfn_core::api::print(format!(
            "END memory is_managed: {}, {:?}",
            ans,
            String::from_utf8(actual_first_bytes.to_vec())
        ));
        ans
    }

    /// Get the schema label
    pub fn schema_label(&self) -> Option<SchemaLabel> {
        dfn_core::api::print(format!("START Partitions::schema_label: ()"));
        let metadata_memory = self.get(Self::METADATA_MEMORY_ID);
        State::schema_version_from_memory(&metadata_memory)
    }

    /// Gets a partition.
    pub fn get(&self, memory_id: MemoryId) -> VirtualMemory<DefaultMemoryImpl> {
        self.memory_manager.borrow().get(memory_id)
    }
}

impl From<DefaultMemoryImpl> for Partitions {
    /// Gets an existing memory manager, if there is one.  If not, creates a new memory manager,
    /// obliterating any existing memory.
    ///
    /// Note: This is equivalent to `MemoryManager::init()`.
    fn from(memory: DefaultMemoryImpl) -> Self {
        dfn_core::api::print(format!("START Partitions::from<DefaultMemoryImpl>: ()"));
        let memory_manager = MemoryManager::init(memory);
        Partitions { memory_manager }
    }
}

/// Gets an existing memory manager, if there is one.  If not, returns the unmodified memory.
///
/// Typical usage:
/// - The canister is upgraded.
/// - The stable memory may contain a memory manager _or_ serialized heap data directly in raw memory.
/// - This method gets the memory manager while being non-destructive if there is none.
// Note: Woudl prefer to use TryFrom, but that causes a conflict I don't understand.
//impl TryFrom<DefaultMemoryImpl> for Partitions {
//    type Error = DefaultMemoryImpl;
impl Partitions {
    fn try_from(memory: DefaultMemoryImpl) -> Result<Self, DefaultMemoryImpl> {
        dfn_core::api::print(format!("START Partitions::try_from<DefaultMemoryImpl>: ()"));
        if Self::is_managed(&memory) {
            Ok(Self::from(memory))
        } else {
            Err(memory)
        }
    }
}