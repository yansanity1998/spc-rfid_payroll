import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from 'react-hot-toast';

export const DatabaseTest = () => {
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [sampleRequest, setSampleRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testDatabase();
  }, []);

  const testDatabase = async () => {
    try {
      console.log('[DatabaseTest] Testing database structure...');

      // Test 1: Get table structure information
      const { data: tableData, error: tableError } = await supabase
        .from('requests')
        .select('*')
        .limit(1);

      console.log('[DatabaseTest] Table structure test:', { tableData, tableError });

      // Test 2: Get a sample Gate Pass request
      const { data: sampleData, error: sampleError } = await supabase
        .from('requests')
        .select('*')
        .eq('request_type', 'Gate Pass')
        .limit(1)
        .single();

      console.log('[DatabaseTest] Sample request:', { sampleData, sampleError });

      // Test 3: Check if guard_approved columns exist by trying to select them
      const { data: guardTest, error: guardError } = await supabase
        .from('requests')
        .select('id, guard_approved, guard_approved_by, guard_approved_date')
        .limit(1);

      console.log('[DatabaseTest] Guard columns test:', { guardTest, guardError });

      setTableInfo({
        tableData,
        tableError,
        sampleData,
        sampleError,
        guardTest,
        guardError
      });

      if (sampleData) {
        setSampleRequest(sampleData);
      }

    } catch (error) {
      console.error('[DatabaseTest] Error:', error);
      toast.error('Database test failed');
    } finally {
      setLoading(false);
    }
  };

  const testGuardApproval = async () => {
    if (!sampleRequest) {
      toast.error('No sample request available');
      return;
    }

    try {
      console.log('[DatabaseTest] Testing guard approval update...');

      const { data: updateResult, error: updateError } = await supabase
        .from('requests')
        .update({
          guard_approved: true,
          guard_approved_by: 1, // Test with user ID 1
          guard_approved_date: new Date().toISOString(),
          status: 'Guard Approved'
        })
        .eq('id', sampleRequest.id)
        .select('*')
        .single();

      console.log('[DatabaseTest] Update result:', { updateResult, updateError });

      if (updateError) {
        toast.error('Update failed: ' + updateError.message);
      } else {
        toast.success('Update successful!');
        setSampleRequest(updateResult);
      }

    } catch (error) {
      console.error('[DatabaseTest] Update error:', error);
      toast.error('Update test failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl font-semibold mb-2">Testing Database...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full py-5 px-3 sm:px-5 bg-gray-100">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Database Test</h1>
          <p className="mt-2 text-gray-600">Testing requests table structure and guard approval functionality</p>
        </div>

        <div className="space-y-6">
          {/* Table Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Table Structure Test</h2>
            <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(tableInfo, null, 2)}
            </pre>
          </div>

          {/* Sample Request */}
          {sampleRequest && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-3">Sample Request</h2>
              <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(sampleRequest, null, 2)}
              </pre>
              <button
                onClick={testGuardApproval}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Test Guard Approval Update
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={testDatabase}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Refresh Test
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
