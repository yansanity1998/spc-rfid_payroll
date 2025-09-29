import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../utils/supabase';
import toast, { Toaster } from 'react-hot-toast';

const DiagnoseStaffRole: React.FC = () => {
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnosis = async () => {
    setIsLoading(true);
    let report = '=== STAFF ROLE DIAGNOSIS REPORT ===\n\n';

    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        report += '❌ ERROR: No authenticated user found\n';
        report += `Auth Error: ${authError?.message || 'Unknown'}\n\n`;
        setDiagnosis(report);
        setIsLoading(false);
        return;
      }

      report += `✅ Current User ID: ${user.id}\n`;
      report += `✅ Current User Email: ${user.email}\n\n`;

      // Check roles table for Staff entries
      report += '--- CHECKING ROLES TABLE ---\n';
      const { data: staffRoles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('role', 'Staff');

      if (rolesError) {
        report += `❌ Error querying roles table: ${rolesError.message}\n\n`;
      } else {
        report += `✅ Found ${staffRoles?.length || 0} Staff role(s) in roles table\n`;
        if (staffRoles && staffRoles.length > 0) {
          staffRoles.forEach((role, index) => {
            report += `   Staff Role ${index + 1}: ID=${role.id}, auth_id=${role.auth_id || 'null'}\n`;
          });
        }
        report += '\n';
      }

      // Check users table by auth_id
      report += '--- CHECKING USERS TABLE BY AUTH_ID ---\n';
      const { data: userByAuthId, error: authIdError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (authIdError) {
        report += `❌ No user found by auth_id: ${authIdError.message}\n`;
      } else {
        report += `✅ User found by auth_id: ${userByAuthId.id}\n`;
        report += `   Name: ${userByAuthId.name || 'N/A'}\n`;
        report += `   Email: ${userByAuthId.email}\n`;
        report += `   Role: ${userByAuthId.role}\n`;
        report += `   Status: ${userByAuthId.status}\n`;
        report += `   Auth ID: ${userByAuthId.auth_id}\n`;
      }
      report += '\n';

      // Check users table by email
      report += '--- CHECKING USERS TABLE BY EMAIL ---\n';
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (emailError) {
        report += `❌ No user found by email: ${emailError.message}\n`;
      } else {
        report += `✅ User found by email: ${userByEmail.id}\n`;
        report += `   Name: ${userByEmail.name || 'N/A'}\n`;
        report += `   Email: ${userByEmail.email}\n`;
        report += `   Role: ${userByEmail.role}\n`;
        report += `   Status: ${userByEmail.status}\n`;
        report += `   Auth ID: ${userByEmail.auth_id}\n`;
        
        // Check for auth_id mismatch
        if (userByEmail.auth_id !== user.id) {
          report += `⚠️  AUTH_ID MISMATCH DETECTED!\n`;
          report += `   Database auth_id: ${userByEmail.auth_id}\n`;
          report += `   Supabase Auth ID: ${user.id}\n`;
        }
      }
      report += '\n';

      // Diagnosis and recommendations
      report += '--- DIAGNOSIS & RECOMMENDATIONS ---\n';
      
      if (userByAuthId && userByAuthId.role === 'Staff') {
        report += '✅ DIAGNOSIS: Staff role found by auth_id - login should work\n';
      } else if (userByEmail && userByEmail.role === 'Staff') {
        if (userByEmail.auth_id !== user.id) {
          report += '⚠️  DIAGNOSIS: Staff role found by email but auth_id mismatch\n';
          report += '💡 RECOMMENDATION: Click "Fix Auth ID" button below\n';
        } else {
          report += '✅ DIAGNOSIS: Staff role found by email - login should work\n';
        }
      } else {
        report += '❌ DIAGNOSIS: No Staff role found for this user\n';
        report += '💡 RECOMMENDATION: Contact admin to assign Staff role\n';
      }

    } catch (error) {
      report += `❌ UNEXPECTED ERROR: ${error}\n`;
    }

    setDiagnosis(report);
    setIsLoading(false);
  };

  const fixAuthId = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('No authenticated user found');
        setIsLoading(false);
        return;
      }

      // Find user by email and update auth_id
      const { data: userByEmail, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .eq('role', 'Staff')
        .single();

      if (findError || !userByEmail) {
        toast.error('Staff user not found by email');
        setIsLoading(false);
        return;
      }

      // Update auth_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_id: user.id })
        .eq('id', userByEmail.id);

      if (updateError) {
        toast.error(`Failed to fix auth_id: ${updateError.message}`);
      } else {
        toast.success('Auth ID fixed successfully! Try logging in again.');
      }

    } catch (error) {
      toast.error(`Unexpected error: ${error}`);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Staff Role Diagnostic Tool
            </h1>
            <p className="text-gray-600">
              Diagnose and fix Staff login authentication issues
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={runDiagnosis}
              disabled={isLoading}
              className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Running Diagnosis...' : 'Run Diagnosis'}
            </button>
            
            <button
              onClick={fixAuthId}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Fixing...' : 'Fix Auth ID'}
            </button>
          </div>

          {diagnosis && (
            <div className="bg-gray-100 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Diagnosis Report
              </h2>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                {diagnosis}
              </pre>
            </div>
          )}

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnoseStaffRole;
